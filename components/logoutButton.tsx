// components/LogoutButton.tsx
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { logoutUser } from "../services/auth";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/"); // back to index (login/signup)
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={styles.button}>
      <Text style={styles.text}>Logout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ff4444",
    borderRadius: 8,
    marginRight: 10,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
});
