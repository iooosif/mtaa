import PillBox from '@/components/PillBox';
import { useTheme } from '@/context/ThemeContex';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Text,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ENV } from '@/utils/env';

interface Topic {
  id: string;
  name: string;
}

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch topics from backend
  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://10.0.2.2:8080/topics');
      const result = await response.json();

      if (response.ok && result.data) {
        // Transform the data to match our Topic interface
        const formattedTopics = result.data.map((topic: any) => ({
          id: topic.id.toString(),
          name: topic.name,
        }));
        setTopics(formattedTopics);
      } else {
        console.log('Error fetching topics:', result.error);
        // Use default topics as fallback
        setTopics([
          { id: 'dormitory', name: 'Dormitory' },
          { id: 'university', name: 'University' },
          { id: 'canteen', name: 'Canteen' },
          { id: 'library', name: 'Library' },
          { id: 'other', name: 'Other' },
        ]);

        Alert.alert(
          'Connection Error',
          'Could not load topics from server. Using default topics instead.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      // Use default topics as fallback
      setTopics([
        { id: 'dormitory', name: 'Dormitory' },
        { id: 'university', name: 'University' },
        { id: 'canteen', name: 'Canteen' },
        { id: 'library', name: 'Library' },
        { id: 'other', name: 'Other' },
      ]);

      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Using default topics instead.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicPress = (topicId: string, topicName: string) => {
    router.push({
      pathname: '/topics/topic',
      params: { id: topicId, name: topicName },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ImageBackground
        source={theme.colors.background}
        resizeMode="cover"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Home</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading topics...</Text>
            </View>
          ) : (
            <View style={styles.topics}>
              {topics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  onPress={() => handleTopicPress(topic.id, topic.name)}
                  style={styles.pillWrapper}
                >
                  <PillBox text={topic.name} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const dynamicStyles = (theme: any) =>
  StyleSheet.create({
    pillWrapper: {
      margin: 10,
    },
    safeArea: {
      flex: 1,
      width: '100%',
      paddingTop: StatusBar.currentHeight || 10,
      alignItems: 'center',
    },
    headerText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    header: {
      paddingHorizontal: 20,
      marginBottom: 20,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    topics: {
      flex: 1,
      marginTop: Platform.OS === 'ios' ? 0 : 70,
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
  });
