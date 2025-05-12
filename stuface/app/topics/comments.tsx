import React, { useState, useEffect } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ENV} from "@/utils/env"

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

// Define comment type
interface Comment {
  id: string;
  username: string;
  text: string;
  likes: number;
  timestamp: string;
}

export default function CommentsScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const { postId, username } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedLikedPosts = await AsyncStorage.getItem('likedPosts');
        const storedLikedComments = await AsyncStorage.getItem('likedComments');

        setCurrentUsername(storedUsername);
        setUserId(storedUserId);
        setLikedPosts(storedLikedPosts ? JSON.parse(storedLikedPosts) : []);
        setLikedComments(
          storedLikedComments ? JSON.parse(storedLikedComments) : [],
        );
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        fetchPost(),
        fetchComments()
      ])
    } catch (e) {
      console.error("Error during refresh: ", e)
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchPost();
  }, [postId, username]);

  // Fetch post comments
  useEffect(() => {
    fetchComments();
  }, [postId]);

  // Move your fetch post logic to a separate function
const fetchPost = async () => {
  if (!postId) return;

    const fetchPost = async () => {
      setIsLoadingPost(true);
      try {
        const response = await fetch(`http://10.0.2.2:8080/posts/${postId}`);
        const result = await response.json();

    if (response.ok && result.data) {
      setPost({
        id: result.data.id.toString(),
        username: result.data.username || username as string,
        body: result.data.content,
        likes: result.data.votes,
        comments: result.data.comment_count || 0,
        timestamp: new Date(result.data.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        has_image: result.data.has_image || false,
        location: result.data.location || undefined,
      });
    } else {
      console.error('Error fetching post:', result.error);

      // Create fallback post with data from params
      if (postId && username) {
        setPost({
          id: postId as string,
          username: username as string,
          body: "Content not available",
          likes: 0,
          comments: 0,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          has_image: false,
          location: undefined,
        });
      } else {
        Alert.alert('Error', 'Failed to load post details');
      }
    }
  } catch (error) {
    console.error('Error fetching post:', error);
    Alert.alert('Connection Error', 'Could not connect to the server');
  } finally {
    setIsLoadingPost(false);
  }
};

    fetchPost();
  }, [postId]);

  // Fetch post comments
  useEffect(() => {
    if (!postId) return;

    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        console.log("Fetching comments for post ID:", postId);
        const response = await fetch(`http://10.0.2.2:8080/posts/${postId}/comments`);
        const result = await response.json();

        console.log("Raw comments response:", result);

        if (response.ok && result.data) {
          // Check if result.data is an array
          if (!Array.isArray(result.data)) {
            console.error("Expected comments data to be an array but got:", typeof result.data);
            setComments([]);
            return;
          }

          console.log("Number of comments received:", result.data.length);

          // Map each comment with full inspection of data properties
          const formattedComments = result.data.map((comment: any) => {
            console.log("Processing comment:", comment);

            return {
              id: comment.id?.toString() || "unknown",
              username: comment.username || "Anonymous",
              text: comment.content || "",
              likes: comment.votes || 0,
              timestamp: comment.created_at
                ? new Date(comment.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : "Just now",
            };
          });

          console.log("Formatted comments:", formattedComments);
          setComments(formattedComments);
        } else {
          console.log('No comments found or error:', result.error || "Unknown error");
          setComments([]);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
        setComments([]);
      } finally {
        setIsLoadingComments(false);
      }
    };

    fetchComments();
  }, [postId]);

  const handleLikePost = async () => {
    if (!userId || !post) return;

    const postIdStr = post.id.toString();
    const hasLiked = likedPosts.includes(postIdStr);

    try {
      const newLikeCount = hasLiked ? post.likes - 1 : post.likes + 1;
      setPost({ ...post, likes: newLikeCount });

      // Call API to update likes
      const response = await fetch(`http://10.0.2.2:8080/post/${post.id}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote: 1 }),
      });

      if (!response.ok) {
        setPost({ ...post, likes: post.likes });
        setLikedPosts(likedPosts);
        await AsyncStorage.setItem('likedPosts', JSON.stringify(likedPosts));
        console.error('Failed to update post likes');
      }
    } catch (error) {
      setPost({ ...post, likes: post.likes });
      setLikedPosts(likedPosts);
      await AsyncStorage.setItem('likedPosts', JSON.stringify(likedPosts));
      console.error('Error updating post likes:', error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!userId) return;

    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const hasLiked = likedComments.includes(commentId);

    try {
      const updatedComments = comments.map((c) =>
        c.id === commentId
          ? { ...c, likes: hasLiked ? c.likes - 1 : c.likes + 1 }
          : c,
      );
      setComments(updatedComments);

      // Call API to update likes
      const response = await fetch(`http://10.0.2.2:8080/comment/${commentId}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote: 1 }),
      });

      if (!response.ok) {
        setComments(comments);
        setLikedComments(likedComments);
        await AsyncStorage.setItem(
          'likedComments',
          JSON.stringify(likedComments),
        );
        console.error('Failed to update comment likes');
      }
    } catch (error) {
      setComments(comments);
      setLikedComments(likedComments);
      await AsyncStorage.setItem(
        'likedComments',
        JSON.stringify(likedComments),
      );
      console.error('Error updating comment likes:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !userId || !postId) return;

    setIsSubmitting(true);

  try {
    console.log("Submitting comment to:", `http://10.0.2.2:8080/posts/${postId}/comments`);
    console.log("Comment data:", { user_id: userId, content: commentText });

    const response = await fetch(`http://10.0.2.2:8080/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        content: commentText,
      }),
    });

      const result = await response.json();
      console.log('Comment submission result:', result);

      if (response.ok && result.data) {
        const newComment: Comment = {
          id: result.data.id.toString(),
          username: currentUsername || 'You',
          text: result.data.content,
          likes: 0,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        setComments((prevComments) => [newComment, ...prevComments]);

        if (post) {
          setPost({
            ...post,
            comments: post.comments + 1,
          });
        }

        setCommentText('');
      } else {
        console.error('Error adding comment:', result.error);
        Alert.alert('Error', 'Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Connection Error', 'Could not connect to the server');
    } finally {
      setIsSubmitting(false);
    }
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
            <Text style={styles.headerText}>Comments</Text>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {isLoadingPost ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading post...</Text>
              </View>
            ) : (
              <View style={styles.container}>
                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
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
                  {post && (
                    <View>
                      <View style={styles.postCard}>
                        <View style={styles.usernameContainer}>
                          <Ionicons
                            name="person-circle-outline"
                            size={20}
                            color={theme.colors.text}
                            style={styles.userIcon}
                          />
                          <Text style={styles.username}>{post.username}</Text>
                        </View>
                        <View style={styles.bodyContainer}>
                          <Text style={styles.body}>{post.body}</Text>

                          {/* Use EXACTLY the same image component as in topic.tsx */}
                          {post.has_image && (
                            <View style={styles.postImageContainer}>
                              <Image
                                source={{ uri: `${ENV.API_URL}/posts/${post.id}/image` }}
                                style={styles.postImage}
                                resizeMode="cover"
                              />
                            </View>
                          )}

                          {/* Use EXACTLY the same location component as in topic.tsx */}
                          {post.location && (
                            <View style={styles.locationContainer}>
                              <Ionicons name="location" size={14} color="#0066FF" />
                              <Text style={styles.locationText}>{post.location}</Text>
                            </View>
                          )}

                          <View style={styles.stats}>
                            <Text
                              style={[styles.statText, styles.timestampText]}
                            >
                              {post.timestamp}
                            </Text>
                            <TouchableWithoutFeedback onPress={handleLikePost}>
                              <View style={styles.statItem}>
                                <Ionicons
                                  name={
                                    likedPosts.includes(post.id.toString())
                                      ? 'thumbs-up'
                                      : 'thumbs-up-outline'
                                  }
                                  size={16}
                                  color="#000"
                                />
                                <Text style={styles.statText}>
                                  {post.likes}
                                </Text>
                              </View>
                            </TouchableWithoutFeedback>
                            <View style={styles.statItem}>
                              <Ionicons
                                name="chatbubble-outline"
                                size={16}
                                color="#000"
                              />
                              <Text style={styles.statText}>
                                {post.comments}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Comment Section Header */}
                      <View style={styles.commentSectionHeader}>
                        <Text style={styles.commentSectionTitle}>Comments</Text>
                      </View>

                      {isLoadingComments ? (
                        <View style={styles.loadingCommentsContainer}>
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.primary}
                          />
                          <Text style={styles.loadingText}>
                            Loading comments...
                          </Text>
                        </View>
                      ) : comments.length > 0 ? (
                        comments.map((comment) => (
                          <View key={comment.id} style={styles.commentCard}>
                            <View style={styles.usernameContainer}>
                              <Ionicons
                                name="person-circle-outline"
                                size={18}
                                color={theme.colors.text}
                                style={styles.userIcon}
                              />
                              <Text style={styles.username}>
                                {comment.username}
                              </Text>
                            </View>
                            <View style={styles.commentBodyContainer}>
                              <Text style={styles.commentText}>
                                {comment.text}
                              </Text>
                              <View style={styles.stats}>
                                <Text
                                  style={[
                                    styles.statText,
                                    styles.timestampText,
                                  ]}
                                >
                                  {comment.timestamp}
                                </Text>
                                <TouchableWithoutFeedback
                                  onPress={() => handleLikeComment(comment.id)}
                                >
                                  <View style={styles.statItem}>
                                    <Ionicons
                                      name={
                                        likedComments.includes(comment.id)
                                          ? 'thumbs-up'
                                          : 'thumbs-up-outline'
                                      }
                                      size={14}
                                      color="#000"
                                    />
                                    <Text style={styles.statText}>
                                      {comment.likes}
                                    </Text>
                                  </View>
                                </TouchableWithoutFeedback>
                              </View>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noCommentsText}>
                          No comments yet. Be the first to comment!
                        </Text>
                      )}

                      <View style={{ height: 80 }} />
                    </View>
                  )}
                </ScrollView>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      bottom: Platform.OS === 'android' ? 50 : 0,
                    },
                  ]}
                >
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={commentText}
                      onChangeText={setCommentText}
                      placeholder="Add a comment..."
                      placeholderTextColor={theme.colors.text + '80'}
                      multiline={true}
                      maxLength={500}
                      editable={!isSubmitting}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!commentText.trim() || isSubmitting) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="send" size={20} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const dynamicStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
    },
    keyboardAvoidingView: {
      flex: 1,
      position: 'relative',
    },
    scrollContent: {
      padding: 15,
      paddingBottom: Platform.OS === 'android' ? 150 : 120,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.secondary,
      marginBottom: 20,
    },
    inputWrapper: {
      flex: 1,
      marginRight: 10,
      backgroundColor: theme.colors.card,
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 2,
    },
    input: {
      fontSize: 14,
      padding: 24,
      color: theme.colors.text,
      maxHeight: 80,
      minHeight: 36,
      paddingTop: 8,
      paddingBottom: 8,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.primary + '80',
      shadowOpacity: 0.1,
      elevation: 1,
    },
    background: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    safeArea: {
      flex: 1,
      width: '100%',
      paddingTop: StatusBar.currentHeight || 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
    },
    backButton: {
      position: 'absolute',
      top: 15,
      left: 15,
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
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingCommentsContainer: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: theme.colors.text,
      textAlign: 'center',
    },
    postCard: {
      marginBottom: 20,
      borderRadius: 10,
      overflow: 'hidden',
    },
    commentCard: {
      marginBottom: 12,
    },
    usernameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    userIcon: {
      marginRight: 5,
    },
    username: {
      fontSize: 15,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    bodyContainer: {
      backgroundColor: '#E0F7FA',
      borderRadius: 10,
      padding: 20,
      minHeight: 100,
    },
    commentBodyContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 15,
      padding: 10,
      marginBottom: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    body: {
      fontSize: 14,
      color: '#000000',
      lineHeight: 20,
    },
    commentText: {
      fontSize: 14,
      color: '#000000',
      lineHeight: 20,
    },
    stats: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 5,
      alignItems: 'center',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 10,
    },
    statText: {
      fontSize: 12,
      color: theme.colors.primary,
      marginLeft: 3,
    },
    timestampText: {
      color: theme.colors.text + '80',
    },
    commentSectionHeader: {
      marginVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: 5,
    },
    commentSectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    noCommentsText: {
      textAlign: 'center',
      padding: 20,
      color: theme.colors.text + '80',
      fontStyle: 'italic',
    },
    // inputWrapper: {
    //   flex: 1,
    //   marginRight: 10,
    //   backgroundColor: theme.colors.card,
    //   borderRadius: 25, // More rounded corners
    //   paddingHorizontal: 15,
    //   paddingVertical: 8,
    //   shadowColor: '#000',
    //   shadowOffset: { width: 0, height: 1 },
    //   shadowOpacity: 0.1,
    //   shadowRadius: 1,
    //   elevation: 2,
    // },
    // input: {
    //   fontSize: 14,
    //   color: theme.colors.text,
    //   maxHeight: 80,
    //   minHeight: 36, // Ensure consistent height
    //   paddingTop: 8, // Better text positioning
    //   paddingBottom: 8,
    // },
    // sendButton: {
    //   width: 40,
    //   height: 40,
    //   borderRadius: 20,
    //   backgroundColor: theme.colors.primary,
    //   justifyContent: 'center',
    //   alignItems: 'center',
    //   shadowColor: '#000',
    //   shadowOffset: { width: 0, height: 2 },
    //   shadowOpacity: 0.2,
    //   shadowRadius: 2,
    //   elevation: 3, // Add shadow on Android
    // },
    // sendButtonDisabled: {
    //   backgroundColor: theme.colors.primary + '80',
    //   shadowOpacity: 0.1, // Reduced shadow when disabled
    //   elevation: 1,
    // },
  });
