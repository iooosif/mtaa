import { ImageBackground,  Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import Buttons from "@/components/Buttons";
import { useTheme } from "@/context/ThemeContex";
import React from "react";

export default function Index() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
          <Text style={{ fontSize: 32, fontWeight: "bold", marginTop: 150 }}>
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
