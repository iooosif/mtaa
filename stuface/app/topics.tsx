import React from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { useTheme } from '@/context/ThemeContex';

export default function SearchScreen() {
  const { theme } = useTheme();

  return (
    <ImageBackground
      source={theme.colors.background}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <Text style={{ color: theme.colors.text, fontSize: 24 }}>Topics Screen</Text>
    </ImageBackground>
  );
}
