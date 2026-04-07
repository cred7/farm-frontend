import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

type Coord = { latitude: number; longitude: number };

type MapScreenProps = {
  initialCoords: Coord[];
  refreshArea?: () => void;
};

export default function MapScreen({
  initialCoords,
  refreshArea,
}: MapScreenProps) {
  const [coords, setCoords] = useState<Coord[]>(initialCoords || []);
  const [farmId, setFarmId] = useState<string | null>(null);

  const urls =
    Platform.OS === "android"
      ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
      : "http://localhost:8000";
  const BACKEND_URL = urls + "/api/";

  useEffect(() => {
    const loadFarm = async () => {
      const id = await AsyncStorage.getItem("selectedFarmId");
      if (id) setFarmId(id);
    };
    loadFarm();
  }, []);

  const updatePoint = async (index: number, lat: number, lng: number) => {
    if (!farmId) return;

    try {
      const token = await AsyncStorage.getItem("accessToken");
      await fetch(`${BACKEND_URL}farm-points/${index}/`, {
        method: "PATCH",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      const newCoords = [...coords];
      newCoords[index] = { latitude: lat, longitude: lng };
      setCoords(newCoords);

      if (refreshArea) refreshArea();
    } catch (err) {
      console.error("Failed to update point", err);
    }
  };

  if (!coords.length) return null;

  return (
    <View style={styles.container}>
      <Text
        style={{ textAlign: "center", margin: 20, fontSize: 16, color: "red" }}
      >
        {" "}
        go to the web to view the map, android map setup not enabled yet
      </Text>
      {/* <MapView
        style={styles.map}
        initialRegion={{
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {coords.map((coord, index) => (
          <Marker
            key={index}
            coordinate={coord}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              updatePoint(index, latitude, longitude);
            }}
          />
        ))}

        <Polygon coordinates={coords} />
      </MapView> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
