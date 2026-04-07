import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import MapScreen from "../components/Map";

type UploadResponse = { lat: number; lng: number };
type UploadResponseArea = {
  area_m2: string;
  hectares: string;
  acres: string;
  coord: [number, number][];
};
type QueueItem = {
  uri?: string;
  base64?: string;
  name: string;
  type: string;
  farm_id: string;
  is_boundary: boolean;
};

const urls =
  Platform.OS === "android"
    ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
    : "http://localhost:8000";
const BACKEND_URL = urls + "/api/";
export default function FarmCapture() {
  const [image, setImage] = useState<string | null>(null);
  const [farmId, setFarmId] = useState("");
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [responseArea, setResponseArea] = useState<UploadResponseArea | null>(
    null,
  );
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isBoundary, setIsBoundary] = useState(true);

  useEffect(() => {
    loadQueue();
    loadSelectedFarm();
  }, []);

  const loadSelectedFarm = async () => {
    const id = await AsyncStorage.getItem("selectedFarmId");
    if (id) setFarmId(id);
  };

  const loadQueue = async () => {
    const stored = await AsyncStorage.getItem("uploadQueue");
    if (stored) setQueue(JSON.parse(stored));
  };

  const saveQueue = async (newQueue: QueueItem[]) => {
    setQueue(newQueue);
    await AsyncStorage.setItem("uploadQueue", JSON.stringify(newQueue));
  };

  const pickImage = async () => {
    if (!farmId) return setMessage("No farm selected");

    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        setImage(URL.createObjectURL(file));
        await handleUpload(file);
      };
      input.click();
    } else {
      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        exif: true,
      });
      if (!result.canceled) {
        const img = result.assets[0];
        setImage(img.uri);
        await handleUpload({
          uri: img.uri,
          name: "photo.jpg",
          type: "image/jpeg",
        });
      }
    }
  };

  const saveOffline = async (file: any) => {
    const item: QueueItem = {
      uri: file.uri,
      name: file.name,
      type: file.type,
      farm_id: farmId,
      is_boundary: isBoundary,
    };
    await saveQueue([...queue, item]);
  };

  const handleUpload = async (file: any) => {
    setLoading(true);
    setMessage("");
    const formData = new FormData();
    if (Platform.OS === "web") formData.append("image", file);
    else
      formData.append("image", {
        uri: file.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
    formData.append("farm_id", farmId);
    formData.append("is_boundary", isBoundary ? "true" : "false");

    let attempts = 0;
    const maxRetries = 3;
    while (attempts < maxRetries) {
      try {
        const token = await AsyncStorage.getItem("accessToken");

        const res = await fetch(BACKEND_URL + "farm-points/upload_image/", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });
        if (!res.ok) {
          const err = await res.text();
          setMessage(`❌ ${err}`);
          setLoading(false);
          return;
        }
        const data: UploadResponse = await res.json();
        setResponse(data);
        setMessage("✅ Uploaded successfully");
        setLoading(false);
        return;
      } catch {
        attempts++;
        if (attempts >= maxRetries) {
          await saveOffline(file);
          setMessage("📴 Network error. Saved offline.");
          setLoading(false);
          return;
        }
      }
    }
  };

  const syncQueue = async () => {
    if (!queue.length) return setMessage("No pending uploads");
    setLoading(true);
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      const formData = new FormData();
      try {
        if (Platform.OS === "web" && item.base64) {
          const blob = await (await fetch(item.base64)).blob();
          formData.append(
            "image",
            new File([blob], item.name, { type: item.type }),
          );
        } else if (item.uri)
          formData.append("image", {
            uri: item.uri,
            name: item.name,
            type: item.type,
          } as any);
        formData.append("farm_id", item.farm_id);
        formData.append("is_boundary", item.is_boundary ? "true" : "false");
        const token = await AsyncStorage.getItem("accessToken");
        const res = await fetch(BACKEND_URL + "farm-points/upload_image/", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });
        if (!res.ok) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    await saveQueue(remaining);
    setLoading(false);
    setMessage("🔄 Sync complete");
  };

  const getArea = async () => {
    setResponseArea(null);
    setMessage("");
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const res = await fetch(BACKEND_URL + `farms/${farmId}/area/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data: UploadResponseArea = await res.json();
        setResponseArea(data);
      } else {
        const err = await res.text();
        setMessage(err);
      }
    } catch {
      setMessage("Network error fetching area");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>🌱 Farm Capture</Text>
            {message && <Text style={styles.message}>{message}</Text>}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text>📍 Boundary Point</Text>
              <Switch
                value={isBoundary}
                onValueChange={setIsBoundary}
                style={{ marginLeft: 10 }}
              />
            </View>

            <Button
              title="📷 Capture / Upload Image"
              onPress={pickImage}
              color="#4CAF50"
            />

            <View style={{ marginTop: 10 }}>
              <Button
                title="🔄 Sync Offline Data"
                onPress={syncQueue}
                color="#2196F3"
              />
            </View>

            {loading && (
              <ActivityIndicator
                style={{ marginTop: 15 }}
                size="large"
                color="#FFD700"
              />
            )}
            {image && <Image source={{ uri: image }} style={styles.image} />}
            {response && (
              <Text style={styles.result}>
                Lat: {response.lat} {"\n"}Lng: {response.lng}
              </Text>
            )}
            <Text style={styles.queue}>Pending uploads: {queue.length}</Text>

            <View style={{ marginTop: 15 }}>
              <Button title="📐 Find Area" onPress={getArea} color="#FF5722" />
              {responseArea && (
                <>
                  <Text style={styles.areaText}>
                    Area: {responseArea.area_m2} m²
                  </Text>
                  <Text style={styles.areaText}>
                    Acres: {responseArea.acres}
                  </Text>
                  <Text style={styles.areaText}>
                    Hectares: {responseArea.hectares}
                  </Text>
                </>
              )}
            </View>
          </View>

          {responseArea && (
            <View style={styles.mapCard}>
              <MapScreen
                initialCoords={responseArea.coord.map((p) => ({
                  latitude: p[0],
                  longitude: p[1],
                }))}
                refreshArea={getArea}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F6F9" },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  container: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    width: "100%",
  },
  card: {
    width: Platform.OS === "web" ? "40%" : "90%",
    maxWidth: 480,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  mapCard: {
    width: Platform.OS === "web" ? "40%" : "90%",
    height: 400,
    maxWidth: 480,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 15,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    color: "#EF4444",
    fontWeight: "600",
    marginBottom: 10,
  },
  image: { width: "100%", height: 220, marginTop: 15, borderRadius: 12 },
  result: {
    marginTop: 12,
    textAlign: "center",
    color: "#111827",
    fontWeight: "600",
  },
  queue: { marginTop: 10, textAlign: "center", color: "#6B7280" },
  areaText: {
    marginTop: 5,
    textAlign: "center",
    fontWeight: "600",
    color: "#111827",
  },
});
