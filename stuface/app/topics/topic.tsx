import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  RefreshControl, // Add this import
} from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ENV} from '@/utils/env';

// Define post type
interface Post {
  id: string;
  username: string;
  body: string;
  likes: number;
  comments: number;
  timestamp: string;
  location?: string;
  has_image?: boolean;
}

export default function TopicScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Add this state for refresh control

  // Load current user's username and ID
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        const storedUserId = await AsyncStorage.getItem('userId');
        setCurrentUsername(storedUsername);
        setUserId(storedUserId);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Fetch posts for the selected topic
  useEffect(() => {
    fetchPostsForTopic();
  }, [id]);

  // Use useCallback to memoize the function
  const fetchPostsForTopic = useCallback(async () => {
    if (!id) return;

    try {
      if (!refreshing) {
        setIsLoading(true);
      }

      // Fetch posts for the topic
      const response = await fetch(`http://10.0.2.2:8080/topics/${id}/posts`);
      const result = await response.json();

      if (response.ok && result.data) {
        // Transform the data to match our Post interface
        const formattedPosts = result.data.map((post: any) => {
          return {
            id: post.id.toString(),
            username: post.username,
            body: post.content,
            likes: post.votes,
            comments: post.comment_count || 0,
            timestamp: new Date(post.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            location: post.location || undefined,
            has_image: post.has_image || false,
          };
        });

        setPosts(formattedPosts);
      } else {
        console.log('Error fetching posts or no posts found:', result.error);
        // Use fallback posts if fetch fails
        useFallbackPosts();
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      useFallbackPosts();
    } finally {
      setIsLoading(false);
      setRefreshing(false); // Reset refreshing state when done
    }
  }, [id, refreshing]);

  // Fallback posts when API fails
  const useFallbackPosts = () => {
    setPosts([
      {
        id: '1',
        username: 'turcio',
        body: 'Could not load posts from server. This is a fallback post.',
        likes: 0,
        comments: 0,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  // Add onRefresh handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPostsForTopic();
  }, [fetchPostsForTopic]);

  const handleLikePress = async (postId: string) => {
    if (!currentUsername || !userId) return;

    try {
      // Determine if the user is liking or unliking
      const isLiking = !likedPosts[postId];
      const voteValue = isLiking ? 1 : -1;

      // Optimistically update UI
      setLikedPosts((prev) => {
        const updatedLikes = { ...prev };
        if (isLiking) {
          updatedLikes[postId] = true;
        } else {
          delete updatedLikes[postId];
        }
        return updatedLikes;
      });

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, likes: isLiking ? post.likes + 1 : post.likes - 1 }
            : post,
        ),
      );

      // Update vote on server
      const response = await fetch(`http://10.0.2.2:8080/post/${postId}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
      );

      if (!response.ok) {
        // If server update fails, revert the optimistic update
        console.log('Failed to update vote on server');
        setLikedPosts((prev) => {
          const updatedLikes = { ...prev };
          if (!isLiking) {
            updatedLikes[postId] = true;
          } else {
            delete updatedLikes[postId];
          }
          return updatedLikes;
        });

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes: isLiking ? post.likes - 1 : post.likes + 1 }
              : post,
          ),
        );
      }
    } catch (error) {
      console.error('Error updating post vote:', error);
    }
  };

  const handleCommentPress = (postId: string, username: string, hasImage: boolean, location?: string) => {
    router.push({
      pathname: '/topics/comments',
      params: {
        postId,
        username,
        hasImage: hasImage ? 'true' : 'false',
        location: location || ''
      },
    });
  };

  // Function to handle post deletion
  const handleDeletePost = async (postId: string) => {
    if (!userId) return;

    // Show confirmation dialog first
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Show loading state
              setIsLoading(true);

              // Call the API to delete the post
              const response = await fetch(`${ENV.API_URL}/post/${postId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                // Remove the post from local state
                setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
                Alert.alert("Success", "Post deleted successfully");
              } else {
                const errorData = await response.json();
                Alert.alert("Error", errorData.error || "Failed to delete post");
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert("Error", "Failed to delete post. Please try again.");
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={theme.colors.background}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerText}>{name || 'Topic'}</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading posts...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                  title="Pull to refresh"
                  titleColor={theme.colors.text}
                />
              }
            >
              {posts.length > 0 ? (
                posts.map((post) => (
                  <View key={post.id} style={styles.postCard}>
                    <View style={styles.usernameContainer}>
                      <Ionicons
                        name="send"
                        size={16}
                        color={theme.colors.text}
                        style={styles.airplaneIcon}
                      />
                      <Text style={styles.username}>{post.username}</Text>

                      {/* Delete button - only visible for the current user's posts */}
                      {post.username === currentUsername && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeletePost(post.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.bodyContainer}>
                      <Text style={styles.body}>{post.body}</Text>

                      {post.has_image && (
                        <View style={styles.postImageContainer}>
                          <Image
                            source={{ uri: `${ENV.API_URL}/posts/${post.id}/image` }}
                            style={styles.postImage}
                            resizeMode="cover"
                          />
                        </View>
                      )}

                      {post.location && (
                        <View style={styles.locationContainer}>
                          <Ionicons name="location" size={14} color="#0066FF" />
                          <Text style={styles.locationText}>
                            {post.location}
                          </Text>
                        </View>
                      )}

                      <View style={styles.stats}>
                        <Text style={[styles.statText, styles.timestampText]}>
                          {post.timestamp}
                        </Text>
                        <TouchableWithoutFeedback
                          onPress={() => handleLikePress(post.id)}
                        >
                          <View style={styles.statItem}>
                            <Image
                              source={require('@/assets/images/like_topik.png')}
                              style={styles.statIcon}
                            />
                            <Text style={styles.statText}>{post.likes}</Text>
                          </View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback
                          onPress={() => handleCommentPress(post.id, post.username)}
                        >
                          <View style={styles.statItem}>
                            <Image
                              source={require('@/assets/images/comment.png')}
                              style={styles.statIcon}
                            />
                            <Text style={styles.statText}>{post.comments}</Text>
                          </View>
                        </TouchableWithoutFeedback>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No posts yet in this topic</Text>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

// Your existing styles remain unchanged
const dynamicStyles = (theme: any) =>
  StyleSheet.create({
    background: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      paddingTop: StatusBar.currentHeight || 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
    },
    backButton: {
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 1,
      padding: 8,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#5182FF',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: 'black',
      shadowOffset: { width: 1, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
    },
    headerText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
      flex: 1,
      textAlign: 'center',
    },
    scrollContent: {
      padding: 15,
      marginTop: 15,
      bottom: 30,
    },
    postCard: {
      marginBottom: 15,
    },
    usernameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    airplaneIcon: {
      marginRight: 5,
    },
    username: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    bodyContainer: {
      backgroundColor: '#E0F7FA',
      borderRadius: 10,
      padding: 20,
      minHeight: 100,
    },
    body: {
      fontSize: 14,
      color: '#000000',
    },
    stats: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 'auto',
      paddingTop: 10,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 10,
    },
    statIcon: {
      width: 14,
      height: 14,
      marginRight: 4,
    },
    statText: {
      fontSize: 12,
      color: '#000000',
    },
    timestampText: {
      color: '#000000',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: theme.colors.text,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 50,
      fontSize: 16,
      color: theme.colors.text,
      opacity: 0.7,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    locationText: {
      fontSize: 12,
      color: '#0066FF',
      marginLeft: 4,
      fontStyle: 'italic',
    },
    postImageContainer: {
      marginTop: 10,
      marginBottom: 10,
    },
    postImage: {
      width: '100%',
      height: 200,
      borderRadius: 10,
    },
    deleteButton: {
      marginLeft: 'auto',
      padding: 5,
    },
  });
