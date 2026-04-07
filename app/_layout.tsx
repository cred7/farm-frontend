import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { useColorScheme, View } from "react-native";
import LogoutButton from "../components/logoutButton";
import UserArea from "../components/userArea";
import { getTheme } from "../constant/Colors";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem("accessToken");
    setIsLoggedIn(!!token);
  };

  const HeaderRight = () => (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {isLoggedIn && <UserArea />}
      {isLoggedIn && <LogoutButton />}
    </View>
  );

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerTintColor: theme.title,
          headerStyle: { backgroundColor: theme.navBackground },
          headerRight: HeaderRight,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="createFarm" options={{ title: "Create Farm" }} />
        <Stack.Screen name="farm" options={{ title: "Get Farm Details" }} />
      </Stack>
    </>
  );
}
