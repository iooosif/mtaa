import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import ChatPill from '@/components/ChatPill';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ENV } from '@/utils/env';

// Define types
interface Conversation {
  id: string;
  participants: string[];
  last_message: string;
  last_message_time: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  lastname: string;
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Add refreshing state

  // Navigate to message screen
  const navigateToMessages = (conversationId: string, displayName: string) => {
    router.push({
      pathname: '/messages',
      params: {
        conversationId: conversationId,
        username: displayName,
      },
    });
  };

  // Load user data and conversations
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedUsername = await AsyncStorage.getItem('username');

        setUserId(storedUserId);
        setUsername(storedUsername);

        if (storedUserId) {
          fetchConversations(storedUserId);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadData();
  }, []);

  // Fetch conversations function
  const fetchConversations = async (userIdToFetch: string) => {
    try {
      const response = await fetch(
        `http://10.0.2.2:8080/conversations/${userId}`,
      );
      const result = await response.json();

      console.log('Conversations response:', result);

      if (response.ok && result.data) {
        setConversations(result.data);
      } else {
        console.log('No conversations found or server returned an error');
        // Set empty array to show "No conversations yet" message
        setConversations([]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Set empty array on error
      setConversations([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false); // End refreshing state
    }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    if (userId) {
      fetchConversations(userId);
    } else {
      setRefreshing(false);
    }
  };

  // Fetch all users
  const fetchAllUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://10.0.2.2:8080/users');
      const result = await response.json();

      console.log('Users response:', result);

      if (response.ok && result.data) {
        // Filter out the current user
        const users = result.data.filter(
          (user: User) => user.username !== username,
        );
        setAllUsers(users);
        setFilteredUsers(users);
      } else {
        console.log('No users found or server returned an error');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search query
  useEffect(() => {
    if (allUsers.length > 0) {
      const filtered = allUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.lastname.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);

  // Create or find conversation
  const createOrFindConversation = async (
    selectedUserId: string,
    selectedUsername: string,
  ) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Try to find existing conversation by username first
      // This assumes conversations.participants contains usernames
      const existingConversation = conversations.find((conv) => {
        const otherParticipants = conv.participants.filter(
          (p) => p !== username,
        );
        return (
          otherParticipants.length === 1 &&
          otherParticipants[0] === selectedUsername
        );
      });

      if (existingConversation) {
        console.log('Found existing conversation:', existingConversation.id);
        setShowSearch(false);
        setSearchQuery('');
        navigateToMessages(existingConversation.id, selectedUsername);
        return;
      }

      // No existing conversation, create a new one
      console.log(
        `Creating new conversation between ${userId} and ${selectedUserId}`,
      );
      const response = await fetch('http://10.0.2.2:8080/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participants: [userId, selectedUserId],
        }),
      });

      const result = await response.json();
      console.log('Create conversation response:', result);

      if (response.ok && result.data) {
        // Success - navigate to the new conversation
        setShowSearch(false);
        setSearchQuery('');

        // Refresh conversations list
        fetchConversations(userId);

        // Navigate to the new conversation
        navigateToMessages(result.data.id, selectedUsername);
      } else {
        console.error('Failed to create conversation:', result.error);
        Alert.alert(
          'Error',
          'Failed to create conversation. Please try again.',
        );
      }
    } catch (error) {
      console.error('Error creating/finding conversation:', error);
      Alert.alert(
        'Error',
        'Network error. Please check your connection and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle search modal and fetch users when opening
  const toggleSearch = () => {
    if (!showSearch) {
      fetchAllUsers();
    }
    setShowSearch(!showSearch);
  };

  return (
    <ImageBackground
      source={theme.colors.background}
      resizeMode="cover"
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Chat</Text>
          <TouchableOpacity style={styles.newChatButton} onPress={toggleSearch}>
            <Ionicons
              name="create-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Conversations List */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {conversations.length > 0 ? (
            conversations.map((conversation) => {
              // For display purposes, filter out the current user from participants
              const otherParticipants = conversation.participants.filter(
                (participant) => participant !== username,
              );
              const displayName = otherParticipants.join(', ');

              // Format the timestamp or use a placeholder
              const timeDisplay = conversation.last_message_time
                ? new Date(conversation.last_message_time).toLocaleTimeString(
                    [],
                    { hour: '2-digit', minute: '2-digit' },
                  )
                : 'N/A';

              return (
                <ChatPill
                  key={conversation.id}
                  username={displayName}
                  lastMessage={conversation.last_message || 'No messages yet'}
                  time={timeDisplay}
                  avatar={require('@/assets/images/react-logo.png')}
                  unread={false}
                  onPress={() =>
                    navigateToMessages(conversation.id, displayName)
                  }
                />
              );
            })
          ) : (
            <Text style={styles.emptyText}>No conversations yet</Text>
          )}
        </ScrollView>

        {/* User Search Modal */}
        <Modal
          visible={showSearch}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSearch(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Conversation</Text>
                <TouchableOpacity onPress={() => setShowSearch(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color={theme.colors.text}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  placeholderTextColor={theme.colors.text + '80'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
              </View>

              {isLoading ? (
                <ActivityIndicator
                  size="large"
                  color={theme.colors.primary}
                  style={styles.loader}
                />
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.userItem}
                      onPress={() =>
                        createOrFindConversation(item.id, item.username)
                      }
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {item.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.username}</Text>
                        <Text style={styles.userFullName}>
                          {item.name} {item.lastname}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      {searchQuery
                        ? 'No users found matching your search'
                        : 'No users available'}
                    </Text>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const dynamicStyles = (theme: any) =>
  StyleSheet.create({
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    headerText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    newChatButton: {
      padding: 10,
    },
    scrollContent: {
      paddingHorizontal: 10,
      paddingBottom: 20,
      minHeight: '100%', // This ensures pull-to-refresh works when there's not enough content
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 50,
      fontSize: 16,
      color: theme.colors.text,
      opacity: 0.7,
    },
    loader: {
      marginTop: 50,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      height: '80%',
      backgroundColor: theme.colors.card,
      borderRadius: 15,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      margin: 10,
      borderRadius: 10,
      paddingHorizontal: 10,
    },
    searchIcon: {
      marginRight: 5,
    },
    searchInput: {
      flex: 1,
      height: 50,
      color: theme.colors.text,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 5,
    },
    userFullName: {
      fontSize: 14,
      color: theme.colors.text + '99',
    },
  });
