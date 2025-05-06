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
  Alert,
} from "react-native";
import Inputs from "@/components/Inputs";
import { useTheme } from "@/context/ThemeContex";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  async function login() {
    // first set username and password // this can later be removed now just for development
    if(password !== "" && username !== "") {
      // testing
      saveLoginData({ username: username, password: password });
      updateUsername(username);
      return router.push({
        pathname: "/home",
      })
    }

    fetch('http://localhost:8080/login', {
      method: "POST",
      body: JSON.stringify({ username: username, password: password }),
    })
    .then((response) => {
      if(response.status === 200) {
        return response.json()
      } else {
        Alert.alert("Error", "Invalid username or password", [{text: "OK"}])
      }
    })
    .then((data) => {
      console.log(data);
      saveLoginData(data)
      updateUsername(data.username);
      router.push({
        pathname: "/home",
      });
    })
    .catch((e) => {
      console.log(e);
      Alert.alert("Error", "Connection error", [{text: "OK"}])
    })
  }

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
            <Inputs placeholder="Username" isPassword={false} value={username} onChangeText={setUsername}/>
            <Inputs placeholder="Password" isPassword={true} value={password} onChangeText={setPassword}/>
            <Buttons title="Login" onPress={() => {
              login();
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
