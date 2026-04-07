import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  ViewProps,
} from "react-native";
import { getTheme } from "../../constant/Colors";

export default function ThemedText({
  style,
  title = false,
  ...props
}: {
  style?: StyleProp<TextStyle>;
  title?: boolean;
} & ViewProps) {
  const color = useColorScheme();
  const theme = getTheme(color);
  const textColor = title ? theme.title : theme.text;
  return <Text style={[{ color: textColor }, style]} {...props} />;
}

const styles = StyleSheet.create({});
