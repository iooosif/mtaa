import { Alert, ImageBackground, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import Buttons from "@/components/Buttons";
import { useTheme } from "@/context/ThemeContex";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();
  const { theme } = useTheme();
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function updateUsername(value: string) {
    try {
      await AsyncStorage.setItem("username", value);
      setUsername(value);
    } catch (e) {
      console.log(e);
    }
  }

  async function loadLoginData() {
    try {
      const value = await AsyncStorage.getItem("loginData");
      if (value !== null) {
        // We have data!!
        const parsedValue = JSON.parse(value);
        console.log(parsedValue);
        updateUsername(parsedValue.username);
        // Use the parsed value as needed
      }
      setIsLoading(false);
    } catch (e) {
      console.log(e);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLoginData();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (username) {
      // Show welcome alert first
      Alert.alert(
        "Welcome Back",
        `You are logged in as ${username}`,
        [
          {
            text: "Continue",
            onPress: () => {
              // Navigate after the user acknowledges the alert
              router.push({
                pathname: "/home",
              });
            }
          }
        ]
      );
    } else {
      // Not logged in - show an alert that they need to log in
      Alert.alert(
        "Login Required",
        "Please login to continue",
        [{ text: "OK" }]
      );
    }
  }, [username, isLoading]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ImageBackground
        source={theme.colors.background}
        resizeMode="cover"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: theme.colors.text, fontSize: 32, fontWeight: "bold", marginTop: 150 }}>
            STUFace
          </Text>
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Buttons
              title="Login"
              onPress={() => {
                router.push({
                  pathname: "/login",
                });
              }}
            />
            <Text style={{ color: theme.colors.text, margin: 10 }}>OR</Text>
            <Buttons
              title="Register"
              onPress={() => {
                router.push({
                  pathname: "/register",
                });
              }}
            />
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
