import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { apiFetch, AuthExpiredError } from "../services/fetch";

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
      await apiFetch(`farm-points/${index}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      const newCoords = [...coords];
      newCoords[index] = { latitude: lat, longitude: lng };
      setCoords(newCoords);

      if (refreshArea) refreshArea();
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        console.error("Auth expired while updating native map point");
      }
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
