// /app/ManageFarms.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Button,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch, AuthExpiredError } from "../services/fetch";

export default function ManageFarms() {
  const router = useRouter();

  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [newFarmName, setNewFarmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      const res = await apiFetch("farms/");
      const data = await res.json();
      setFarms(data);
      if (data.length > 0) setSelectedFarm(data[0].id);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        setMessage("Session expired. Please log in again.");
        return;
      }
      setMessage("Network error fetching farms");
    }
  };

  const handleUseFarm = async () => {
    if (!selectedFarm) return setMessage("Select a farm first");
    await AsyncStorage.setItem("selectedFarmId", String(selectedFarm));
    router.push("/farmCapture"); // capture page
  };

  const handleViewSummary = async () => {
    if (!selectedFarm) return setMessage("Select a farm first");
    await AsyncStorage.setItem("selectedFarmId", String(selectedFarm));
    router.push("/farmSummary"); // summary/analytics page
  };

  const handleCreateFarm = async () => {
    if (!newFarmName.trim()) {
      setMessage("Enter a farm name");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("farms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newFarmName }),
      });

      const data = await res.json();
      await AsyncStorage.setItem("selectedFarmId", String(data.id));
      router.push("/farmCapture");
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        setMessage("Session expired. Please log in again.");
      } else if (err instanceof Error) {
        setMessage(err.message || "Network error creating farm");
      } else {
        setMessage("Network error creating farm");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.title}>🌾 Manage Your Farms</Text>
            <Text style={styles.subtitle}>
              Select an existing farm or create a new one to get started.
            </Text>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            {farms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Existing Farm</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedFarm}
                    onValueChange={(itemValue) => setSelectedFarm(itemValue)}
                    style={styles.picker}
                  >
                    {farms.map((farm) => (
                      <Picker.Item
                        key={farm.id}
                        label={farm.name}
                        value={farm.id}
                      />
                    ))}
                  </Picker>
                </View>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Use Selected Farm"
                    onPress={handleUseFarm}
                    color="#4CAF50"
                  />
                </View>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="View Summary / Analytics"
                    onPress={handleViewSummary}
                    color="#FF9800"
                  />
                </View>
              </View>
            )}

            <View style={[styles.section, { marginTop: 30 }]}>
              <Text style={styles.sectionTitle}>Or Create New Farm</Text>
              <TextInput
                placeholder="New Farm Name"
                placeholderTextColor="#9CA3AF"
                value={newFarmName}
                onChangeText={setNewFarmName}
                style={styles.input}
              />
              <View style={styles.buttonWrapper}>
                <Button
                  title={loading ? "Creating..." : "Create and Use"}
                  onPress={handleCreateFarm}
                  color="#2196F3"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  container: {
    width: "100%",
    maxWidth: SCREEN_WIDTH > 768 ? "50%" : "90%",
    marginHorizontal: "auto",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    color: "#2E3A59",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 20,
  },
  section: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#2E3A59",
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    fontSize: 16,
    color: "#111827",
  },
  pickerWrapper: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  picker: {
    width: "100%",
    height: 50,
  },
  buttonWrapper: {
    width: "100%",
    marginVertical: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  message: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
});
