import { useTheme } from "@/context/ThemeContex";
import React from "react";
import { View, StyleSheet, TouchableHighlight, Text } from "react-native";

type buttonProps = {
  title: string;
  onPress: () => void;
};

function Buttons(props: buttonProps) {
  const {theme} = useTheme();
  const styles = dynamicStyles(theme);
  return (
    <View>
      <TouchableHighlight style={styles.button} onPress={props.onPress}>
        <Text style={{ fontSize: 16, fontWeight:"bold", color: theme.colors.text, textAlign: "center", padding: 10}}>{props.title}</Text>
      </TouchableHighlight>
    </View>
  );
}

const dynamicStyles =(theme: any) => StyleSheet.create({
  button: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 25,
    width: 150,
    margin: 25,
    shadowColor: "black",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
});

export default Buttons;
