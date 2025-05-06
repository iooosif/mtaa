import React from "react";
import {
  Image,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import { useTheme } from "@/context/ThemeContex";

type ChatPillProps = {
  username: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  avatar: ImageSourcePropType;
  onPress?: () => void;
};

export default function ChatPill({
  username,
  lastMessage,
  time,
  unread = false,
  avatar,
  onPress,
}: ChatPillProps) {
  const { theme } = useTheme();
  const styles = getStyles(theme, unread);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={avatar} style={styles.avatar} />
      <View style={styles.textContainer}>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.message} numberOfLines={1}>
          {lastMessage}
        </Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </TouchableOpacity>
  );
}

const getStyles = (theme: any, unread: boolean) =>
  StyleSheet.create({
    container: {
      borderColor: theme.colors.border,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: theme.colors.terniary,
      borderRadius: 12,
      marginVertical: 5,
      marginHorizontal: 10,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
      justifyContent: "center",
    },
    username: {
      fontSize: 16,
      fontWeight: unread ? "bold" : "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    message: {
      fontSize: 14,
      fontWeight: unread ? "bold" : "normal",
      color: theme.colors.primary || "#666",
    },
    time: {
      fontSize: 12,
      color: theme.colors.muted || "#999",
      marginLeft: 8,
    },
  });
