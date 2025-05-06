import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar
} from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import ChatPill from '@/components/ChatPill';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define conversation type
interface Conversation {
  id: string;
  participants: string[];
  last_message: string;
  last_message_time: string;
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const navigateToMessages = (conversationId: string, username: string) => {
    router.push({
      pathname: '/messages',
      params: {
        conversationId: conversationId,
        username: username
      }
    })
  }

  // Load user data and conversations
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        setUserId(storedUserId);

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
  const fetchConversations = async (userId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8080/conversations/${userId}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setConversations(result.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
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
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {conversations.length > 0 ? (
            conversations.map(conversation => {
              // For display purposes, filter out the current user from participants
              const otherParticipants = conversation.participants.filter(
                name => name !== userId
              );
              const displayName = otherParticipants.join(', ');

              return (
                <ChatPill
                  key={conversation.id}
                  username={displayName}
                  lastMessage={conversation.last_message || 'No messages yet'}
                  time={new Date(conversation.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  avatar={require('@/assets/images/react-logo.png')}
                  unread={false} // can implement unread message tracking later
                  onPress={() => navigateToMessages(conversation.id, displayName)}
                />
              );
            })
          ) : (
            //  existing fallback ChatPill for when no conversations exist
            <ChatPill
              username="John Doe"
              lastMessage="Hey, how are you?"
              time="10:30 AM"
              avatar={require('@/assets/images/react-logo.png')}
              unread={true}
              onPress={() => navigateToMessages('1', 'John Doe')}
            />
          )}
        </ScrollView>
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
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    headerText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    scrollContent: {
      paddingHorizontal: 10,
      paddingBottom: 20,
    },
  });
