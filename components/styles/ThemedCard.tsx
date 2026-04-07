import React from "react";
import {
  StyleProp,
  StyleSheet,
  useColorScheme,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { getTheme } from "../../constant/Colors";

type ThemedProps = {
  style?: StyleProp<ViewStyle>;
} & ViewProps;

export default function ThemedCard({ style, ...props }: ThemedProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  return (
    <View
      style={[{ backgroundColor: theme.uiBackground }, styles.card, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 5,
    padding: 20,
  },
});
