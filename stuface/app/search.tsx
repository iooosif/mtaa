import React from 'react';
import { View, Text, ImageBackground, StyleSheet, SafeAreaView, TouchableWithoutFeedback, Keyboard, StatusBar } from 'react-native';
import { useTheme } from '@/context/ThemeContex';
import Inputs from '@/components/Inputs';
import Buttons from '@/components/Buttons';
import { Stack } from 'expo-router';

export default function SearchScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ImageBackground
          source={theme.colors.background}
          resizeMode="cover"
          style={styles.background}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header - stays on the left */}
            <View style={styles.header}>
              <Text style={styles.headerText}>Search</Text>
            </View>

            {/* Search Input - centered */}
            <View>
              <Inputs placeholder="Search anything..." isPassword={false}/>
            </View>

            {/* Search Button - right-aligned below input */}
            <View style={styles.buttonContainer}>
              <Buttons title="Search" onPress={() => {}} />
            </View>
          </SafeAreaView>
        </ImageBackground>
      </TouchableWithoutFeedback>
    </>
  );
}

const dynamicStyles = (theme: any) => StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    paddingTop: StatusBar.currentHeight || 10,
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
    alignSelf: 'flex-start',  // Keep header on the left
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  buttonContainer: {
    alignSelf: 'flex-end',  // Fix the button alignment
  }
});
