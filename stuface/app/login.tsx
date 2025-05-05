import Buttons from "@/components/Buttons";
import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
} from "react-native";
import Inputs from "@/components/Inputs";
import { useTheme } from "@/context/ThemeContex";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { theme } = useTheme();

  return (
    <>
      {/*TouchableWithoutFeedback nemoze mat viac ako jedno dieta takze pouzivame <></> */}
      <Stack.Screen
        options={{
          headerShown: false,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
                color: theme.colors.text
              }}
            >
              STUFace
            </Text>
            <Inputs placeholder="Username" isPassword={false}/>
            <Inputs placeholder="Password" isPassword={true}/>
            <Buttons title="Login" onPress={() => {
              router.push({
                pathname: '/home',
              })
            }} />
            <Text>OR</Text>
            <Buttons title="Register" onPress={() => {
              router.push({
                pathname: "/register",
              });
            }} />
          </View>
        </ImageBackground>
      </TouchableWithoutFeedback>
    </>
  );
}

const styles = StyleSheet.create({

});
