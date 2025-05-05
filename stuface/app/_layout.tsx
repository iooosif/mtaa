import { ThemeProvider } from "@/context/ThemeContex";
import React, { useEffect } from "react";
import { Platform, StatusBar, View } from "react-native";
import { Stack, Tabs, usePathname } from "expo-router";
import CustomTabBar from "@/components/CustomTabBar";

export default function RootLayout() {
  const pathname = usePathname();
  const isAuthScreen = pathname === '/login' || pathname === '/register' || pathname === '/';

  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
    }
  }, []);

  return (
    <ThemeProvider>
      {isAuthScreen ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <CustomTabBar {...props} />}
        >
          <Tabs.Screen name="home" />
          <Tabs.Screen name="search" />
          <Tabs.Screen name="create" />
          <Tabs.Screen name="chat" />
          <Tabs.Screen name="profile" />

          {/* Hidden screens */}
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="login" options={{ href: null }} />
          <Tabs.Screen name="register" options={{ href: null }} />
        </Tabs>
      )}
    </ThemeProvider>
  );
}
