import AsyncStorage from "@react-native-async-storage/async-storage";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { MapContainer, Marker, Polygon, TileLayer } from "react-leaflet";
import { Platform } from "react-native";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Coord = { latitude: number; longitude: number };
type MapScreenProps = {
  initialCoords: Coord[];
  farmId?: string; // optional, if you want to pass explicitly
  refreshArea?: () => void;
};

export default function MapScreen({
  initialCoords,
  refreshArea,
}: MapScreenProps) {
  const [coords, setCoords] = useState(initialCoords || []);

  const urls =
    Platform.OS === "android"
      ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
      : "http://localhost:8000";
  const BACKEND_URL = urls + "/api/";
  const updatePoint = async (index: number, lat: number, lng: number) => {
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
    <MapContainer
      bounds={coords.map((c: any) => [c.latitude, c.longitude])}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {coords.map((pos: any, index: number) => (
        <Marker
          key={index}
          position={[pos.latitude, pos.longitude]}
          draggable={true}
          eventHandlers={{
            dragend: (e: any) => {
              const { lat, lng } = e.target.getLatLng();
              updatePoint(index, lat, lng);
            },
          }}
        />
      ))}

      <Polygon positions={coords.map((c: any) => [c.latitude, c.longitude])} />
    </MapContainer>
  );
}
