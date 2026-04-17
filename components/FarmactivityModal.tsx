import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch, AuthExpiredError } from "../services/fetch";

// ✅ LOCKED ENUM (no more garbage data)
const ACTIVITY_TYPES = [
  "PLANTING",
  "SPRAYING",
  "HARVEST",
  "FERTILIZING",
  "OTHER",
];

type Props = {
  farmId: string;
  visible: boolean;
  onClose: () => void;
  onWebSocketStart: () => void;
};

export default function FarmActivityModal({
  farmId,
  visible,
  onClose,
  onWebSocketStart,
  // onAdded,
}: Props) {
  const [activityType, setActivityType] = useState("PLANTING");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 📸 PICK + COMPRESS IMAGE
  const pickImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          setImage({ file, preview: URL.createObjectURL(file) });
        }
      };

      input.click();
    } else {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setMessage("Permission required to access images");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        // 🔥 COMPRESS IMAGE
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );

        setImage(compressed);
      }
    }
  };

  // 📦 FORM DATA
  const createFormData = () => {
    const data = new FormData();

    data.append("activity_type", activityType);
    data.append("description", description);

    if (image) {
      if (Platform.OS === "web") {
        data.append("image", image.file);
      } else {
        data.append("image", {
          uri: image.uri,
          name: "activity.jpg",
          type: "image/jpeg",
        } as any);
      }
    }

    return data;
  };

  // 🚀 SUBMIT
  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");

    const token = await AsyncStorage.getItem("accessToken");

    try {
      await apiFetch(`farms/${farmId}/add_activity/`, {
        method: "POST",
        body: createFormData(),
      });

      // onAdded(activityType, description, image);
      setDescription("");
      setImage(null);
      setActivityType("PLANTING");
      console.log("Activity added successfully");
      onWebSocketStart();
      console.log("WebSocket started");
      onClose();
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        setMessage("Session expired. Please log in again.");
      } else if (err instanceof Error) {
        setMessage(err.message || "Network error");
      } else {
        setMessage("Network error");
      }
    }

    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Add Farm Activity</Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* ✅ ENUM SELECTOR */}
          <Text style={styles.label}>Activity Type</Text>
          <View style={styles.typeContainer}>
            {ACTIVITY_TYPES.map((type) => (
              <Text
                key={type}
                style={[
                  styles.typeButton,
                  activityType === type && styles.activeType,
                ]}
                onPress={() => setActivityType(type)}
              >
                {type}
              </Text>
            ))}
          </View>

          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* 📸 IMAGE */}
          <Button title="Pick Image" onPress={pickImage} />

          {image && (
            <Image
              source={{
                uri: Platform.OS === "web" ? image.preview : image.uri,
              }}
              style={styles.preview}
            />
          )}

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

  label: {
    fontWeight: "600",
    marginBottom: 5,
  },

  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },

  typeButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },

  activeType: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    borderColor: "#4CAF50",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  preview: {
    width: "100%",
    height: 150,
    marginTop: 10,
    borderRadius: 8,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
});
