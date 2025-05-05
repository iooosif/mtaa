import React from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import Inputs from '@/components/Inputs';
import Buttons from '@/components/Buttons';

export default function SearchScreen() {
  const { theme } = useTheme();

  return (
    <ImageBackground
      source={theme.colors.background}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <View>
        <Inputs placeholder="Search anything..." isPassword={false}/>
        {/* Touchable w=opacity */}
      </View>
      <View>
        <Buttons title="Search" onPress={() => {}} />
      </View>
    </ImageBackground>
  );
}
