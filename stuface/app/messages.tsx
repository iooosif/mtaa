import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  RefreshControl, // Add this import
} from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Inputs from '@/components/Inputs';
import { ENV } from '@/utils/env';

// Define message type
interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  isMine: boolean;
}

export default function MessagesScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const ws = useRef<WebSocket | null>(null);
  const { conversationId, username } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false); // Add this state

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        setUserId(storedUserId);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [userId, conversationId]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!userId || !conversationId) return;

    // Cleanup any existing connection first
    if (ws.current) {
      ws.current.close();
    }

    // Connect to WebSocket server with proper URL
    const wsUrl = `ws://10.0.2.2:8080/chat?userId=${userId}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connection established');
      // Load previous messages
      fetchMessages();
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        if (data.type === 'message' && data.conversationId === conversationId) {
          // Check if we already have this message (by server-generated id or client timestamp)
          // This prevents showing duplicates
          setMessages((prevMessages) => {
            // Check if message already exists in our list
            const messageExists = prevMessages.some(
              (msg) =>
                // If server message has an ID, check if we have it
                (data.id && msg.id === data.id) ||
                // Or if timestamps match closely (for optimistic updates)
                (!data.id &&
                  data.timestamp &&
                  Math.abs(msg.timestamp - data.timestamp) < 1000 &&
                  msg.text === data.text &&
                  msg.sender === data.sender),
            );

            // Only add the message if it doesn't exist
            if (!messageExists) {
              const newMessage: Message = {
                id: data.id || Date.now().toString(),
                text: data.text,
                sender: data.sender,
                timestamp: data.timestamp || Date.now(),
                isMine: data.sender === userId,
              };

              return [...prevMessages, newMessage];
            }

            return prevMessages;
          });

          // Scroll to bottom on new message
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [userId, conversationId]);

  // Add a function to fetch previous messages
  const fetchMessages = async () => {
    if (!userId || !conversationId) return;

    try {
      const response = await fetch(
        `http://10.0.2.2:8080/conversations/${conversationId}/messages/${userId}`,
      );
      const result = await response.json();

      if (response.ok && result.data) {
        setMessages(result.data);
      } else {
        // Use mock messages if API fails
        useMockMessages();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Use mock messages on error
      useMockMessages();
    } finally {
      // End refreshing state if it was a pull-to-refresh action
      setRefreshing(false);
    }
  };

  // Create a function for mock messages
  const useMockMessages = () => {
    const mockMessages: Message[] = [
      {
        id: '1',
        text: 'Hey there! How are you?',
        sender: 'user2',
        timestamp: Date.now() - 3600000,
        isMine: false,
      },
      {
        id: '2',
        text: "I'm good, thanks! How about you?",
        sender: 'user1',
        timestamp: Date.now() - 3500000,
        isMine: true,
      },
      {
        id: '3',
        text: "I'm doing great! Want to meet up later?",
        sender: 'user2',
        timestamp: Date.now() - 3400000,
        isMine: false,
      },
    ];

    setMessages(mockMessages);
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  // Send message function
  const sendMessage = () => {
    if (!messageText.trim() || !ws.current || !userId || !conversationId)
      return;

    // Generate a client-side message ID
    const clientMessageId = Date.now().toString();
    const timestamp = Date.now();

    // Send message through WebSocket
    const messagePayload = {
      type: 'message',
      text: messageText,
      sender: userId,
      conversationId: conversationId,
      timestamp: timestamp,
      clientMessageId: clientMessageId, // Add this so server can use it
    };

    ws.current.send(JSON.stringify(messagePayload));

    // Optimistically add message to UI with its temporary ID
    const newMessage: Message = {
      id: clientMessageId,
      text: messageText,
      sender: userId,
      timestamp: timestamp,
      isMine: true,
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setMessageText('');

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // For demo purposes, add some mock messages if none exist
  useEffect(() => {
    if (messages.length === 0) {
      useMockMessages();
    }
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={theme.colors.background}
        resizeMode="cover"
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.push('/chat')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={'white'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{username}</Text>
          </View>

          {/* Messages area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? -40 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
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
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.isMine ? styles.myMessage : styles.theirMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{message.text}</Text>
                  <Text style={styles.messageTime}>
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Message input area */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Inputs
                  placeholder="Type a message..."
                  isPassword={false}
                  value={messageText}
                  onChangeText={setMessageText}
                />
              </View>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => sendMessage()}
                disabled={!messageText.trim()}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={
                    messageText.trim()
                      ? theme.colors.primary
                      : theme.colors.text
                  }
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

// Dynamic styles based on theme
const dynamicStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      width: '100%',
      paddingTop: StatusBar.currentHeight || 10,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 10,
      flexDirection: 'row',
      width: '100%',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
    headerTitle: {
      marginTop: 40,
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      flex: 1,
    },
    messagesContainer: {
      flex: 1,
      padding: 16,
    },
    messagesList: {
      paddingBottom: 16,
    },
    messageBubble: {
      maxWidth: '75%',
      padding: 12,
      borderRadius: 20,
      marginBottom: 8,
    },
    myMessage: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    theirMessage: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.secondary,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      color: theme.colors.text,
      fontSize: 16,
    },
    messageTime: {
      fontSize: 12,
      color: theme.colors.text,
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      paddingBottom: 20,
      marginTop: -20,
      marginBottom: 30,
    },
    inputWrapper: {
      flex: 1,
      marginRight: 8,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
