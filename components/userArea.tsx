// components/UserArea.tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../services/fetch";

export default function UserArea({
  username,
}: {
  username: (value: boolean) => void;
}) {
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiFetch("auth/me/");
        const data = await res.json();
        setUser(data);
        username(true);
      } catch (err) {
        // If token has expired or user is not authenticated, just leave user null.
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
