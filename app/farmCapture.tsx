import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Dimensions,
  Platform,
  Image as RNImage,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { v4 as uuidv4 } from "uuid";
import { apiFetch, AuthExpiredError } from "../services/fetch";

import MapScreen from "../components/Map";

type UploadResponse = { lat: number; lng: number };

type UploadResponseArea = {
  area_m2: string;
  hectares: string;
  acres: string;
  coords: { id?: string; lat: number; lng: number }[];
};

type QueueItem = {
  id: string;
  uri?: string;
  name: string;
  type: string;
  farm_id: string;
  is_boundary: boolean;
  lat: number;
  lng: number;
  status: "pending" | "syncing" | "failed" | "synced";
  retries: number;
  createdAt: number;
};

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
  const [isConnected, setIsConnected] = useState(true);

  const SCREEN_WIDTH = Dimensions.get("window").width;
  const isWideScreen = SCREEN_WIDTH > 1000;

  useEffect(() => {
    loadQueue();
    loadSelectedFarm();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected;
      setIsConnected(connected);
      if (connected) syncQueue();
    });

    return () => unsubscribe();
  }, []);

  const loadSelectedFarm = async () => {
    const id = await AsyncStorage.getItem("selectedFarmId");
    if (id) setFarmId(id);
    if (id) getArea(id);
  };

  const loadQueue = async () => {
    const stored = await AsyncStorage.getItem("uploadQueue");
    if (stored) setQueue(JSON.parse(stored));
  };

  const saveQueue = async (newQueue: QueueItem[]) => {
    setQueue(newQueue);
    await AsyncStorage.setItem("uploadQueue", JSON.stringify(newQueue));
  };

  const saveOffline = async (file: QueueItem) => {
    await saveQueue([...queue, file]);
  };

  const uploadSingle = async (file: QueueItem) => {
    try {
      const formData = new FormData();

      if (file.uri) {
        if (Platform.OS === "web") formData.append("image", file.uri);
        else
          formData.append("image", {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any);
      }

      formData.append("farm_id", file.farm_id);
      formData.append("is_boundary", file.is_boundary ? "True" : "False");
      formData.append("lat", file.lat.toString());
      formData.append("lng", file.lng.toString());

      const token = await AsyncStorage.getItem("accessToken");
      await apiFetch("farm-points/upload_image/", {
        method: "POST",
        body: formData,
      });

      return true;
    } catch {
      return false;
    }
  };

  const handleUpload = async (file: QueueItem) => {
    if (!isConnected) {
      await saveOffline(file);
      setMessage("📴 Offline - saved to queue");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      if (file.uri) {
        formData.append("image", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      }
      formData.append("farm_id", file.farm_id);
      formData.append("is_boundary", file.is_boundary ? "True" : "False");
      formData.append("lat", file.lat.toString());
      formData.append("lng", file.lng.toString());

      const res = await apiFetch("farm-points/upload_image/", {
        method: "POST",
        body: formData,
      });
      const data: UploadResponse = await res.json();
      setResponse(data);
      setMessage("✅ Uploaded successfully");
    } catch (err) {
      await saveOffline(file);
      if (err instanceof AuthExpiredError) {
        setMessage("Session expired. Please log in again.");
      } else {
        setMessage("📴 Failed - saved to queue");
      }
    } finally {
      setLoading(false);
    }
  };

  const syncQueue = async () => {
    if (!queue.length) return;
    setLoading(true);

    let updatedQueue = [...queue];
    for (let i = 0; i < updatedQueue.length; i++) {
      let item = updatedQueue[i];
      if (item.status === "synced") continue;
      item.status = "syncing";
      await saveQueue([...updatedQueue]);
      const success = await uploadSingle(item);
      item.status = success ? "synced" : "failed";
      item.retries += success ? 0 : 1;
      updatedQueue[i] = item;
      await saveQueue([...updatedQueue]);
    }

    await cleanQueue();
    setLoading(false);
    setMessage("🔄 Sync complete");
    getArea();
  };

  const cleanQueue = async () => {
    const now = Date.now();
    const filtered = queue.filter(
      (item) =>
        item.status !== "synced" || now - item.createdAt < 24 * 60 * 60 * 1000,
    );
    await saveQueue(filtered);
  };

  // 🔥 Updated pickImage with cross-platform GPS extraction

  const extractGPS = async (asset: any) => {
    if (Platform.OS !== "web") {
      const exif = asset.exif;
      if (!exif?.GPSLatitude || !exif?.GPSLongitude) return null;

      const toDecimal = (coord: number, ref: string) => {
        let dec = coord;
        if (ref === "S" || ref === "W") dec *= -1;
        return dec;
      };

      return {
        lat: toDecimal(exif.GPSLatitude, exif.GPSLatitudeRef),
        lng: toDecimal(exif.GPSLongitude, exif.GPSLongitudeRef),
      };
    } else {
      // Web only
      const EXIF = await import("exif-js");
      return new Promise<{ lat: number; lng: number } | null>((resolve) => {
        const img = new Image();
        img.src = asset;
        img.onload = () => {
          const EXIF = require("exif-js");
          EXIF.getData(img as any, function () {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const lng = EXIF.getTag(this, "GPSLongitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
            const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

            if (!lat || !lng) return resolve(null);

            const toDecimal = (coord: number[], ref: string) => {
              let dec = coord[0] + coord[1] / 60 + coord[2] / 3600;
              if (ref === "S" || ref === "W") dec *= -1;
              return dec;
            };

            resolve({
              lat: toDecimal(lat, latRef),
              lng: toDecimal(lng, lngRef),
            });
          });
        };
      });
    }
  };

  const pickImage = async () => {
    if (!farmId) return setMessage("No farm selected");

    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        setImage(url);

        const gps = await extractGPS(url);
        if (!gps) return setMessage("❌ No GPS data found");

        const fileItem: QueueItem = {
          id: uuidv4(),
          uri: url,
          name: file.name,
          type: file.type,
          farm_id: farmId,
          is_boundary: isBoundary,
          lat: gps.lat,
          lng: gps.lng,
          status: "pending",
          retries: 0,
          createdAt: Date.now(),
        };

        await handleUpload(fileItem);
      };

      input.click();
    } else {
      await Location.requestForegroundPermissionsAsync();

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        exif: true,
      });

      if (!result.canceled) {
        const img = result.assets[0];
        setImage(img.uri);

        const gps = await extractGPS(img);
        if (!gps) return setMessage("❌ No GPS data found");

        const fileItem: QueueItem = {
          id: uuidv4(),
          uri: img.uri,
          name: "photo.jpg",
          type: "image/jpeg",
          farm_id: farmId,
          is_boundary: isBoundary,
          lat: gps.lat,
          lng: gps.lng,
          status: "pending",
          retries: 0,
          createdAt: Date.now(),
        };

        await handleUpload(fileItem);
      }
    }
  };

  const getArea = async (farmIdParam?: string) => {
    setResponseArea(null);
    setMessage("");
    try {
      const id = farmIdParam || farmId;
      if (!id) return;
      const token = await AsyncStorage.getItem("accessToken");

      try {
        const res = await apiFetch(`farms/${id}/area/`);
        const data: UploadResponseArea = await res.json();
        console.log("Area data:", data);
        setResponseArea({
          ...data,
          coords: data.coords.map((p: any) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
          })),
        });
      } catch (err) {
        if (err instanceof AuthExpiredError) {
          setMessage("Session expired. Please log in again.");
        } else if (err instanceof Error) {
          console.error("Error fetching area:", err);
          setMessage(err.message);
        } else {
          setMessage("Network error fetching area");
        }
      }
    } catch {
      setMessage("Network error fetching area");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View
          style={[
            styles.container,
            { flexDirection: isWideScreen ? "row" : "column" },
          ]}
        >
          <View
            style={[styles.card, { maxWidth: isWideScreen ? "50%" : "90%" }]}
          >
            <Text style={styles.title}>🌱 Farm Capture</Text>
            <Text style={{ textAlign: "center", marginBottom: 5 }}>
              {isConnected ? "🟢 Online" : "🔴 Offline"}
            </Text>

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
              <ActivityIndicator style={{ marginTop: 15 }} size="large" />
            )}

            {image && <RNImage source={{ uri: image }} style={styles.image} />}
            {response && (
              <Text style={styles.result}>
                Lat: {response.lat} {"\n"}Lng: {response.lng}
              </Text>
            )}

            <Text style={styles.queue}>
              📦 Pending Sync:{" "}
              {queue.filter((q) => q.status !== "synced").length}
            </Text>

            <View style={{ marginTop: 15 }}>
              <Button
                title="📐 Find Area"
                onPress={() => getArea()}
                color="#FF5722"
              />
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
                farmId={farmId}
                initialCoords={responseArea.coords.map((p) => ({
                  id: p.id,
                  latitude: p.lat,
                  longitude: p.lng,
                }))}
                refreshArea={() => getArea()}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F6F9" },
  scrollContainer: { flexGrow: 1, alignItems: "center", paddingVertical: 20 },
  container: {
    width: "100%",
    maxWidth: 1200,
    justifyContent: "center",
    gap: 20,
  },
  card: {
    flex: 1,
    minWidth: 320,
    maxWidth: 500,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  mapCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 600,
    height: 420,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  message: { textAlign: "center", color: "#EF4444", marginBottom: 10 },
  image: { width: "100%", height: 200, marginTop: 10, borderRadius: 12 },
  areaText: { marginTop: 5, textAlign: "center", fontWeight: "600" },
  result: {
    marginTop: 12,
    textAlign: "center",
    color: "#111827",
    fontWeight: "600",
  },
  queue: { marginTop: 10, textAlign: "center", color: "#6B7280" },
});
