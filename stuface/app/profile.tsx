import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "@/context/ThemeContex";
import { Stack, useRouter } from "expo-router";
import PillBox from "@/components/PillBox";
import Buttons from "@/components/Buttons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  const pills = ["Personal Info", "Settings", "Saved"];
  const routeMap: Record<string, string> = {
    "Personal Info": "personal-info",
    Settings: "settings",
    Saved: "saved",
  };

  useEffect(() => {
    const loadUsername = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem("username");
        setUsername(storedUsername);
      } catch (error) {
        console.error("Error loading username:", error);
      }
    };

    loadUsername();
  }, []);

  // Logout function
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear user data from AsyncStorage
              await AsyncStorage.removeItem("loginData");
              await AsyncStorage.removeItem("username");
              await AsyncStorage.removeItem("userId");

              // You can add more items to clear if needed

              console.log("Logged out successfully");

              // Show success message
              Alert.alert(
                "Logged Out",
                "You have been successfully logged out",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      // Navigate to login screen after showing the message
                      router.replace("/");
                    }
                  }
                ]
              );
            } catch (error) {
              console.error("Error during logout:", error);
              Alert.alert(
                "Error",
                "Failed to log out. Please try again."
              );
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={theme.colors.background}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>{username}</Text>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.content}>
            {/* Avatar */}
            <Image
              source={require("@/assets/images/react-logo.png")}
              style={styles.avatar}
            />

            {/* Pill Boxes */}
            {pills.map((text) => (
              <TouchableOpacity
                key={text}
                style={styles.pillWrapper}
                onPress={() => {
                  const route = routeMap[text];
                  if (route) router.push(`/${route}`);
                }}
              >
                <PillBox text={text} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <Buttons title="Log Out" onPress={handleLogout} />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    background: { flex: 1 },
    safeArea: { flex: 1, paddingTop: StatusBar.currentHeight || 10 },
    header: { paddingHorizontal: 20, paddingBottom: 10 },
    headerText: { fontSize: 32, fontWeight: "bold", color: theme.colors.text },
    content: {
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    avatar: {
      width: 200,
      height: 200,
      borderRadius: 100,
      marginBottom: 30,
    },
    pillWrapper: { marginBottom: 20 },
    logoutContainer: {
      alignItems: "center",
      marginBottom: 100,
    },
  });
