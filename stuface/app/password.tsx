import React, { useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/utils/env'

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = dynamicStyles(theme);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${ENV.API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Password changed successfully');
        router.back();
      } else {
        Alert.alert('Error', result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Connection Error', 'Could not connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={theme.colors.background}
      resizeMode="cover"
      style={styles.background}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={'white'} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerText}>Change Password</Text>
        </View>

        <View style={styles.container}>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current Password"
            secureTextEntry
            placeholderTextColor={theme.colors.text + '80'}
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password"
            secureTextEntry
            placeholderTextColor={theme.colors.text + '80'}
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm New Password"
            secureTextEntry
            placeholderTextColor={theme.colors.text + '80'}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <Ionicons name="reload" size={20} color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
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
      alignSelf: 'center',
    },
    headerText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 40,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    input: {
      height: 50,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 15,
      marginBottom: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
    },
    button: {
      backgroundColor: '#5182FF',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    buttonDisabled: {
      backgroundColor: '#A3BFFA',
    },
    buttonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    backButton: {
      position: 'absolute',
      top: 50,
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
  });
