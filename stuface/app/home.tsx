import PillBox from "@/components/PillBox";
import { useTheme } from "@/context/ThemeContex";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  View,
  TouchableOpacity,
  ScrollView,
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
       {topics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  onPress={() => handleTopicPress(topic.id)}
                  style={styles.pillWrapper}
                >
                  <PillBox text={topic.name} />
                </TouchableOpacity>
              ))}
      </ImageBackground>
    </>

  );
}

const dynamicStyles = (theme: any) => ({
  pillWrapper: {
    margin: 10,
  }
});
