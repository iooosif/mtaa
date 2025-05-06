import { ImageBackground,  Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import Buttons from "@/components/Buttons";
import { useTheme } from "@/context/ThemeContex";
import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();
  const { theme } = useTheme();

  async function setUsername(value: string) {
    try {
      await AsyncStorage.setItem("username", value);
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
        // Use the parsed value as needed
      }
    } catch (e) {
      console.log(e);
    }
  }
  // wrap the loadLoginData function in a useEffect to call it when the component mounts or add loading
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
        {/* toto bol test ci funguje theme <SafeAreaView>
        <View>
          <Switch value={theme === theme} onValueChange={toggleTheme} />
        </View>
        </SafeAreaView> */}
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
            <Text>OR</Text>
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
