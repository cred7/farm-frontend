import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { apiFetch, AuthExpiredError } from "../services/fetch";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Coord = { id?: string; latitude: number; longitude: number };
type MapScreenProps = {
  initialCoords: Coord[];
  farmId?: string;
  refreshArea?: () => void;
};

export default function MapScreen({
  initialCoords,
  farmId,
  refreshArea,
}: MapScreenProps) {
  const [coords, setCoords] = useState<Coord[]>(initialCoords || []);
  const [drawing, setDrawing] = useState(true);
  const [mapType, setMapType] = useState<"standard" | "satellite" | "hybrid">(
    "standard",
  );
  const mapRef = useRef<any>(null);

  // --- Backend calls ---
  const createPoint = async (lat: number, lng: number) => {
    try {
      const res = await apiFetch("farm-points/upload_image/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farm_id: farmId,
          is_boundary: true,
          lat,
          lng,
        }),
      });

      const data = await res.json();
      return data; // {id, lat, lng}
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        console.error("Auth expired while creating point");
      }
      return null;
    }
  };

  const updatePoint = async (id: string, lat: number, lng: number) => {
    try {
      await apiFetch(`farm-points/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      setCoords((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, latitude: lat, longitude: lng } : c,
        ),
      );
      refreshArea?.();
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        console.error("Auth expired while updating point");
      }
    }
  };

  const deletePoint = async (id?: string) => {
    if (!id || !confirm("Delete this point?")) return;

    try {
      await apiFetch(`farm-points/${id}/`, {
        method: "DELETE",
      });
      setCoords((prev) => prev.filter((c) => c.id !== id));
      refreshArea?.();
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        console.error("Auth expired while deleting point");
      }
    }
  };

  // --- Map click handler ---
  let lastClick = 0;
  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const now = Date.now();
        const DOUBLE_CLICK_DELAY = 250; // ms
        if (now - lastClick < DOUBLE_CLICK_DELAY && drawing && farmId) {
          const { lat, lng } = e.latlng;
          const newPoint = await createPoint(lat, lng);
          if (newPoint) {
            setCoords([
              ...coords,
              { id: newPoint.id, latitude: lat, longitude: lng },
            ]);
            refreshArea?.();
          }
        }
        lastClick = now;
      },
    });
    return null;
  };

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setMapType("standard")}>Standard</button>
        <button onClick={() => setMapType("satellite")}>Satellite</button>
        <button onClick={() => setMapType("hybrid")}>Hybrid</button>
      </div>

      <MapContainer
        bounds={coords.map((c) => [c.latitude, c.longitude])}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        doubleClickZoom={false}
      >
        <TileLayer
          url={
            mapType === "standard"
              ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              : mapType === "satellite"
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />

        <MapClickHandler />

        {coords.map((pos) => (
          <Marker
            key={pos.id || `${pos.latitude}-${pos.longitude}`}
            position={[pos.latitude, pos.longitude]}
            draggable={true}
            eventHandlers={{
              dragend: (e: any) => {
                const { lat, lng } = e.target.getLatLng();
                if (!pos.id) return;
                updatePoint(pos.id, lat, lng);
              },
              click: () => deletePoint(pos.id), // click deletes
            }}
          />
        ))}

        {coords.length > 2 && (
          <Polygon positions={coords.map((c) => [c.latitude, c.longitude])} />
        )}
      </MapContainer>
    </>
  );
}
