import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import Inputs from '@/components/Inputs';
import { Ionicons } from '@expo/vector-icons';
import Buttons from '@/components/Buttons';

export default function SearchScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);

  return (
    <ImageBackground
      source={theme.colors.background}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <View style={styles.input}>
        <Inputs placeholder="Enter your post text" isPassword={false}/>
        {/* Touchable w=opacity */}
      </View>
        <Ionicons name="camera" size={24} color="black" />
        <Ionicons name="image" size={24} color="black" />
      <View>
        <Buttons title="Post" onPress={() => {}} />
      </View>
    </ImageBackground>
  );
}

const dynamicStyles = (theme:any) => StyleSheet.create({
  input: {
    width: 300,
    height: 170,
  }
})
