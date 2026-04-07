import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Button,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        router.replace("/createFarm"); // redirect logged-in user
      }
    };
    checkToken();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>🌱 Farm Management App</Text>
        <Text style={styles.subtitle}>
          Manage your farms efficiently. Track crops, productivity, and more.
        </Text>
        <View style={styles.buttonGroup}>
          <View style={styles.buttonWrapper}>
            <Button
              title="Login"
              onPress={() => router.push("/login")}
              color="#4CAF50"
            />
          </View>
          <View style={styles.buttonWrapper}>
            <Button
              title="Sign Up"
              onPress={() => router.push("/register")}
              color="#2196F3"
            />
          </View>
        </View>
        <Text style={styles.footer}>
          Already have an account? Login to continue
        </Text>
      </View>
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F4F8",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    maxWidth: SCREEN_WIDTH > 768 ? "50%" : "90%", // web: 50% max, mobile: 90%
    width: "100%",
    marginHorizontal: "auto", // centers container on web
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
    color: "#2E3A59",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  buttonGroup: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonWrapper: {
    width: "80%",
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden", // ensures Button color respects borderRadius on Android
  },
  footer: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 10,
    textAlign: "center",
  },
});
