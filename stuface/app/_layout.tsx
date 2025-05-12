import { ThemeProvider } from "@/context/ThemeContex";
import React, { useEffect, useState } from "react";
import { Platform, StatusBar, View } from "react-native";
import { Stack, Tabs, usePathname } from "expo-router";
import CustomTabBar from "@/components/CustomTabBar";
import { ENV } from "@/utils/env"; // Import our environment configuration

export default function RootLayout() {
  const pathname = usePathname();
  const isAuthScreen = pathname === '/login' || pathname === '/register' || pathname === '/';
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    // Configure platform-specific settings
    console.log(`App using API URL: ${ENV.API_URL}`);
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
    }

    setIsConfigLoaded(true);
  }, []);

  // Don't render anything until config is loaded
  if (!isConfigLoaded) {
    return null;
  }

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
