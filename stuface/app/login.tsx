import Buttons from '@/components/Buttons';
import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Inputs from '@/components/Inputs';
import { useTheme } from '@/context/ThemeContex';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { theme } = useTheme();

  async function saveLoginData(value: Object) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem('loginData', jsonValue);
    } catch (e) {
      console.log(e);
    }
  }
  async function updateUsername(value: string) {
    try {
      await AsyncStorage.setItem('username', value);
    } catch (e) {
      console.log(e);
    }
  }

  async function login() {
    console.log('Attempting login with:', username, password);

    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password', [
        { text: 'OK' },
      ]);
      return;
    }

    try {
      const response = await fetch('http://10.0.2.2:8080/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      console.log('Login response status:', response.status);

      // Parse the response JSON
      const data = await response.json();
      console.log('Login response data:', data);

      if (response.ok) {
        // Login successful
        console.log('Login successful:', data);

        // Save user data in AsyncStorage
        await saveLoginData({ username: username, password: password });
        await updateUsername(username);

        // Save userId if it exists in the response
        if (data.userId) {
          await AsyncStorage.setItem('userId', data.userId.toString());
        }

        // Navigate to home
        router.push({
          pathname: '/home',
        });
      } else {
        // Login failed with error from server
        Alert.alert(
          'Login Failed',
          data.error || 'Invalid username or password',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Login network error:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please check your internet connection and server status.',
        [{ text: 'OK' }],
      );
    }
  }

  return (
    <>
      {/*TouchableWithoutFeedback nemoze mat viac ako jedno dieta takze pouzivame <></> */}
      <Stack.Screen
        options={{
          headerShown: false,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ImageBackground
          source={theme.colors.background}
          resizeMode="cover"
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
            style={{
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
            }}
          >
            <Ionicons name="arrow-back" size={24} color={'white'} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: 'bold',
                marginTop: 120,
                marginBottom: 120,
                color: theme.colors.text,
              }}
            >
              STUFace
            </Text>
            <Inputs
              placeholder="Username"
              isPassword={false}
              value={username}
              onChangeText={setUsername}
            />
            <Inputs
              placeholder="Password"
              isPassword={true}
              value={password}
              onChangeText={setPassword}
            />
            <Buttons
              title="Login"
              onPress={() => {
                login();
              }}
            />
            <Text>OR</Text>
            <Buttons
              title="Register"
              onPress={() => {
                router.push({
                  pathname: '/register',
                });
              }}
            />
          </View>
        </ImageBackground>
      </TouchableWithoutFeedback>
    </>
  );
}

const styles = StyleSheet.create({});
