import Buttons from '@/components/Buttons';
import Inputs from '@/components/Inputs';
import { useTheme } from '@/context/ThemeContex';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Text,
  ImageBackground,
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Register() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [username, setUsername] = useState('');
  const [lastname, setLastname] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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

  async function register() {
    console.log(
      'Registering user: ',
      username,
      name,
      lastname,
      email,
      password,
      repeatPassword,
    );

    // Add validation for email domain
    if (!email.toLowerCase().endsWith('@stuba.sk')) {
      Alert.alert('Error', 'Only @stuba.sk email addresses are allowed', [
        { text: 'OK' },
      ]);
      return;
    }

    // Add validation for password match
    if (password !== repeatPassword) {
      Alert.alert('Error', 'Passwords do not match', [{ text: 'OK' }]);
      return;
    }

    // Show loading indicator (optional)
    // setIsLoading(true);

    try {
      const response = await fetch('http://10.0.2.2:8080/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          name,
          lastname,
          email,
          password,
          password2: repeatPassword,
        }),
      });

      // Parse the JSON response
      const data = await response.json();

      // Log the full response for debugging
      console.log('Register response:', response.status, data);

      if (response.ok) {
        // Registration successful
        console.log('Registration successful:', data);

        // Save login data
        await saveLoginData({ username, password });
        await updateUsername(username);

        // Show success message
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully!',
          [
            {
              text: 'Continue',
              onPress: () => {
                router.push({
                  pathname: '/home',
                });
              },
            },
          ],
        );
      } else {
        // Registration failed with error from server
        Alert.alert(
          'Registration Failed',
          data.error || 'Unknown error occurred',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      // Network or other error
      console.error('Registration error:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please check your internet connection.',
        [{ text: 'OK' }],
      );
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback
        onPress={() => Keyboard.dismiss()}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
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
              placeholder="Name"
              isPassword={false}
              value={name}
              onChangeText={setName}
            />
            <Inputs
              placeholder="Lastname"
              isPassword={false}
              value={lastname}
              onChangeText={setLastname}
            />
            <Inputs
              placeholder="Username"
              isPassword={false}
              value={username}
              onChangeText={setUsername}
            />
            <Inputs
              placeholder="E-mail@stuba.sk"
              isPassword={false}
              value={email}
              onChangeText={setEmail}
            />
            <Inputs
              placeholder="Password"
              isPassword={true}
              value={password}
              onChangeText={setPassword}
            />
            <Inputs
              placeholder="Repeat Password"
              isPassword={true}
              value={repeatPassword}
              onChangeText={setRepeatPassword}
            />
            <Text>Toggle pre zobrazenie hesiel</Text>
            <Buttons title="Register" onPress={() => register()} />
          </View>
        </ImageBackground>
      </TouchableWithoutFeedback>
    </>
  );
}
