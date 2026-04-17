import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Platform,
  Image as RNImage,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import MapScreen from "../components/Map";
import { apiFetch, AuthExpiredError } from "../services/fetch";

type UploadResponse = { lat: number; lng: number };
type UploadResponseArea = {
  area_m2: string;
  hectares: string;
  acres: string;
  coord: [number, number][];
};
type QueueItem = {
  lat: number;
  lng: number;
  farm_id: string;
  is_boundary: boolean;
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

  // 🔥 Cross-platform GPS extractor
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
        setMessage(`GPS Data: ${JSON.stringify(gps)}`);
        if (!gps) return setMessage("❌ No GPS data found");

        await handleUpload(gps);
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

        await handleUpload(gps);
      }
    }
  };

  const saveOffline = async (gps: any) => {
    const item: QueueItem = {
      lat: gps.lat,
      lng: gps.lng,
      farm_id: farmId,
      is_boundary: isBoundary,
    };
    await saveQueue([...queue, item]);
  };

  const handleUpload = async (gps: { lat: number; lng: number }) => {
    setLoading(true);
    setMessage("");

    let attempts = 0;
    const maxRetries = 3;

    while (attempts < maxRetries) {
      try {
        const res = await apiFetch("farm-points/upload_image/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            farm_id: farmId,
            is_boundary: isBoundary,
            lat: gps.lat,
            lng: gps.lng,
          }),
        });

        const data: UploadResponse = await res.json();
        setResponse(data);
        setMessage("✅ Uploaded successfully");
        setLoading(false);
        return;
      } catch (err) {
        attempts++;
        if (attempts >= maxRetries) {
          await saveOffline(gps);
          if (err instanceof AuthExpiredError) {
            setMessage("Session expired. Please log in again.");
          } else {
            setMessage("📴 Saved offline");
          }
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
      try {
        await apiFetch("farm-points/upload_image/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(item),
        });
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
      try {
        const res = await apiFetch(`farms/${farmId}/area/`);
        const data: UploadResponseArea = await res.json();
        setResponseArea(data);
      } catch (err) {
        if (err instanceof AuthExpiredError) {
          setMessage("Session expired. Please log in again.");
        } else if (err instanceof Error) {
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
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>🌱 Farm Capture</Text>
            {message && <Text style={styles.message}>{message}</Text>}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text>📍 Boundary</Text>
              <Switch value={isBoundary} onValueChange={setIsBoundary} />
            </View>

            <Button title="📷 Capture" onPress={pickImage} />
            <Button title="🔄 Sync" onPress={syncQueue} />
            {loading && <ActivityIndicator size="large" />}

            {image && <RNImage source={{ uri: image }} style={styles.image} />}
            {response && (
              <Text>
                Lat: {response.lat} {"\n"}Lng: {response.lng}
              </Text>
            )}

            <Text>Pending: {queue.length}</Text>

            <Button title="📐 Find Area" onPress={getArea} />
            {responseArea && (
              <>
                <Text>{responseArea.area_m2} m²</Text>
                <Text>{responseArea.acres} acres</Text>
                <Text>{responseArea.hectares} ha</Text>
              </>
            )}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F6F9" },
  scrollContainer: { flexGrow: 1, alignItems: "center" },
  container: { width: "100%", alignItems: "center" },
  card: {
    width: "90%",
    maxWidth: 480,
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
  },
  mapCard: {
    width: "90%",
    height: 400,
    marginTop: 20,
  },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  message: { textAlign: "center", color: "red" },
  image: { width: "100%", height: 200, marginTop: 10 },
});
