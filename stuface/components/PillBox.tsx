import { useTheme } from '@/context/ThemeContex';
import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';

type boxProps = {
  text: string;
}

export default function PillBox(props: boxProps) {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);

  return (
    <View style={styles.pillBox}>
      <Text style={{ color: theme.colors.text, fontSize: 32 }}>{props.text}</Text>
    </View>

  );
}

const dynamicStyles = (theme: any) => StyleSheet.create({
  pillBox: {
    backgroundColor: theme.colors.primary,
    width: 310,
    height: 98,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3.84,
    elevation: 5,
  }
})
