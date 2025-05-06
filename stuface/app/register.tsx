import Buttons from "@/components/Buttons";
import Inputs from "@/components/Inputs";
import { useTheme } from "@/context/ThemeContex";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Text,
  ImageBackground,
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Register() {
  const router = useRouter();
  const { theme } = useTheme();

  async function saveLoginData(value: Object) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem("loginData", jsonValue);
    } catch (e) {
      console.log(e);
    }
  }

  async function updateUsername(value: string) {
    try {
      await AsyncStorage.setItem("username", value);
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback
        onPress={() => Keyboard.dismiss()}
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ImageBackground
          source={theme.colors.background}
          resizeMode="cover"
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
            style={{
              position: "absolute",
              top: 50,
              left: 20,
              zIndex: 1,
              padding: 8,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#5182FF",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "black",
              shadowOffset: { width: 1, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 1,
            }}
          >
            <Ionicons name="arrow-back" size={24} color={"white"} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                marginTop: 120,
                marginBottom: 120,
              }}
            >
              STUFace
            </Text>
            <Inputs placeholder="Name" isPassword={false} />
            <Inputs placeholder="E-mail@stuba.sk" isPassword={false} />
            <Inputs placeholder="Password" isPassword={true} />
            <Inputs placeholder="Repeat Password" isPassword={true} />
            <Text>Toggle pre zobrazenie hesiel + fix theme</Text>
            <Buttons title="Register" onPress={() => {}} />
          </View>
        </ImageBackground>
      </TouchableWithoutFeedback>
    </>
  );
}
