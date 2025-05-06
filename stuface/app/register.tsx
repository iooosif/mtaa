import Buttons from "@/components/Buttons";
import Inputs from "@/components/Inputs";
import { useTheme } from "@/context/ThemeContex";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Text,
  ImageBackground,
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Register() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [username, setUsername] = useState("");
  const [lastname, setLastname] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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

  async function register() {
    fetch("http://localhost:8080/register", {
      method: "POST",
      body: JSON.stringify({
        username: name,
        email: email,
        password: password,
        password2: repeatPassword,
      })
    })
    .then(response => {
      response.json();
    })
    .then((data: any) => {
      console.log(data);
      if (data.message) {
        saveLoginData({ username: name, password: password });
        updateUsername(name);
        router.push({
          pathname: "/home",
        });
      } else {
        Alert.alert("Error", data.error, [{ text: "OK" }]); // or error i dont remember
      }
    })
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
            <Inputs placeholder="Name" isPassword={false} value={name} onChangeText={setName} />
            <Inputs placeholder="Lastname" isPassword={false} value={lastname} onChangeText={setLastname} />
            <Inputs placeholder="Username" isPassword={false} value={username} onChangeText={setUsername} />
            <Inputs placeholder="E-mail@stuba.sk" isPassword={false} value={email} onChangeText={setEmail} />
            <Inputs placeholder="Password" isPassword={true} value={password} onChangeText={setPassword} />
            <Inputs placeholder="Repeat Password" isPassword={true} value={repeatPassword} onChangeText={setRepeatPassword}/>
            <Text>Toggle pre zobrazenie hesiel</Text>
            <Buttons title="Register" onPress={() => register()} />
          </View>
        </ImageBackground>
      </TouchableWithoutFeedback>
    </>
  );
}
