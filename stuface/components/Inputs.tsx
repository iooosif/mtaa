import { useTheme } from '@/context/ThemeContex';
import React from 'react'
import { TextInput, StyleSheet } from 'react-native';

type inputProps = {
    placeholder: string;
    isPassword: boolean;
    value?: string;
    onChangeText?: (text: string) => void;
}

export default function Inputs( props: inputProps) {
  const {theme} = useTheme();
  const styles = dynamicStyles(theme)
  return (
    <TextInput style={styles.input} secureTextEntry={props.isPassword} placeholder={props.placeholder} value={props.value} onChangeText={props.onChangeText}>
    </TextInput>
  )
}

const dynamicStyles = (theme: any) => StyleSheet.create({
    input: {
        backgroundColor: theme.colors.terniary,
        overflow: "hidden",
        borderWidth: 1,
        color: theme.colors.text,
        borderColor: theme.colors.border,
        padding: 10,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 1,
        width: 260,
        height: 50,
        margin: 10,
      },
})
