import React from "react";
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
} from "react-native";
import { useTheme } from "@/context/ThemeContex";
import { Stack, useRouter } from "expo-router";
import PillBox from "@/components/PillBox";
import Buttons from "@/components/Buttons";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const pills = ["Personal Info", "Settings", "Saved"];
  const routeMap: Record<string, string> = {
    "Personal Info": "personal-info",
    Settings: "settings",
    Saved: "saved",
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
            <Text style={styles.headerText}>Username</Text>
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
            <Buttons title="Log Out" onPress={() => { /* logout logic */ }} />
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
