import React from "react";
import {
  StyleProp,
  useColorScheme,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { getTheme, Theme } from "../../constant/Colors";

type ThemedViewProps = {
  style?: StyleProp<ViewStyle>;
} & ViewProps;

const ThemedView = ({ style, ...props }: ThemedViewProps) => {
  const colorScheme = useColorScheme(); // "light" | "dark" | null
  const theme: Theme = getTheme(colorScheme); // Colors.light | Colors.dark

  return (
    <View style={[{ backgroundColor: theme.background }, style]} {...props} />
  );
};

export default ThemedView;
