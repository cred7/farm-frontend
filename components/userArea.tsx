// components/UserArea.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const urls =
  Platform.OS === "android"
    ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
    : "http://localhost:8000";
const BACKEND_URL = urls + "/api/";

export default function UserArea() {
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) return;

        const res = await fetch(BACKEND_URL + "auth/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Failed fetching user info", err);
      }
    };

    fetchUser();
  }, []);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>👨‍🌾 {user.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    marginRight: 10,
  },
  text: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
