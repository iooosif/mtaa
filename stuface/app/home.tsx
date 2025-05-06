import PillBox from "@/components/PillBox";
import { useTheme } from "@/context/ThemeContex";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Text,
  StatusBar,
  Platform
} from "react-native";

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);

  const topics = [
    {
      id: 1,
      name: "Dormitory",
    },
    {
      id: 2,
      name: "University",
    },
    {
      id: 3,
      name: "Canteen",
    },
    {
      id: 4,
      name: "Library",
    },
    {
      id: 5,
      name: "Other",
    },
  ];

  const handleTopicPress = (topicId: number) => {
    // navigate to the topic
    // router.push({
    //   pathname: "/topic/[id]",
    //   params: { id: topicId },
    // })
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ImageBackground
        source={theme.colors.background}
        resizeMode="cover"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Home</Text>
          </View>
          <View style={styles.topics}>
       {topics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  onPress={() => handleTopicPress(topic.id)}
                  style={styles.pillWrapper}
                >
                  <PillBox text={topic.name} />
                </TouchableOpacity>
              ))}
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>

  );
}

const dynamicStyles = (theme: any) => StyleSheet.create({
  pillWrapper: {
    margin: 10,
  },
  safeArea: {
      flex: 1,
      width: '100%',
      paddingTop: StatusBar.currentHeight || 10,
      alignItems: 'center',
    },
    headerText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    header: {
      paddingHorizontal: 20,
      marginBottom: 20,
      marginTop: 10,
      alignSelf: 'flex-start',  // Keep header on the left
    },
    topics: {
      flex: 1,
      marginTop: Platform === "iOS" ? 0: 70,
    }
});
