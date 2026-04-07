import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { useColorScheme } from "react-native";
import { getTheme } from "../../constant/Colors";

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      ></Stack>
    </>
  );
};
export default RootLayout;
