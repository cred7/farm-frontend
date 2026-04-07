import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const urls =
  Platform.OS === "android"
    ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
    : "http://localhost:8000";
const BACKEND_URL = urls + "/api/";

type Props = {
  farmId: string;
  visible: boolean;
  onClose: () => void;
  onAdded: (activityType: string, description: string) => void;
};

export default function FarmActivityModal({
  farmId,
  visible,
  onClose,
  onAdded,
}: Props) {
  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!activityType) return setMessage("Activity type required");
    setLoading(true);
    setMessage("");

    const token = await AsyncStorage.getItem("accessToken");
    try {
      console.log("using url", BACKEND_URL);
      console.log("Submitting activity", { farmId, activityType, description });
      const res = await fetch(`${BACKEND_URL}farms/${farmId}/add_activity/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ activity_type: activityType, description }),
      });
      console.log("Response status", res.status);

      if (!res.ok) {
        const err = await res.text();
        setMessage(err);
      } else {
        onAdded(activityType, description); // pass data back
        setActivityType("");
        setDescription("");
        onClose();
      }
    } catch (e) {
      setMessage("Network error");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Add Farm Activity</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Activity Type (e.g., Planting)"
            value={activityType}
            onChangeText={setActivityType}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          {loading ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.buttons}>
              <Button title="Cancel" color="#999" onPress={onClose} />
              <Button
                title="Add Activity"
                onPress={handleSubmit}
                color="#4CAF50"
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 15 },
  message: { color: "red", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  buttons: { flexDirection: "row", justifyContent: "space-between" },
});
