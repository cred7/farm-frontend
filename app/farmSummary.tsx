import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FarmActivityModal from "../components/FarmactivityModal";

type Activity = {
  id: number;
  activity_type: string;
  description: string;
  date: string;
};

type FarmSummary = {
  area_m2: number;
  hectares: number;
  acres: number;
  crop_type?: string;
  points_count?: number;
  expected_yield?: number;
  activities: Activity[];
};

const urls =
  Platform.OS === "android"
    ? "https://semivolatile-nancey-incongrously.ngrok-free.dev"
    : "http://localhost:8000";
const BACKEND_URL = urls + "/api/";

export default function FarmSummaryScreen() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [summary, setSummary] = useState<FarmSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch summary
  const fetchSummary = async (id: string) => {
    setLoading(true);
    const token = await AsyncStorage.getItem("accessToken");
    try {
      const res = await fetch(`${BACKEND_URL}farms/${id}/summary/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched summary", data);
        setSummary(data);
      } else {
        console.error("Failed to fetch summary", await res.text());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Add activity
  const addActivity = (activity_type: string, description: string) => {
    if (!summary) return;
    const newActivity: Activity = {
      id: Date.now(),
      activity_type,
      description,
      date: new Date().toISOString(),
    };
    setSummary({
      ...summary,
      activities: [newActivity, ...(summary.activities || [])],
    });
  };

  useEffect(() => {
    const loadFarm = async () => {
      const id = await AsyncStorage.getItem("selectedFarmId");
      if (id) {
        setFarmId(id);
        fetchSummary(id);
      }
    };
    loadFarm();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Farm Summary</Text>
      {loading && <ActivityIndicator />}

      {summary && farmId && (
        <>
          <Text>Area: {summary.area_m2} m²</Text>
          <Text>Hectares: {summary.hectares}</Text>
          <Text>Acres: {summary.acres}</Text>
          {summary.crop_type && <Text>Crop: {summary.crop_type}</Text>}
          {summary.points_count !== undefined && (
            <Text>Defined Points: {summary.points_count}</Text>
          )}
          {summary.expected_yield !== undefined && (
            <Text>Expected Yield: {summary.expected_yield}</Text>
          )}

          <Button title="Add Activity" onPress={() => setModalVisible(true)} />

          <Text style={styles.subtitle}>Activities</Text>
          {(summary.activities || []).length === 0 && (
            <Text>No activities logged yet</Text>
          )}
          {(summary.activities || []).map((a) => (
            <View key={a.id} style={styles.activity}>
              <Text style={styles.activityType}>{a.activity_type}</Text>
              <Text>{a.description}</Text>

              <Text style={styles.date}>
                {new Date(a.date).toLocaleDateString()}
              </Text>
            </View>
          ))}

          <FarmActivityModal
            farmId={farmId}
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onAdded={(activity_type, description) => {
              addActivity(activity_type, description);
              setModalVisible(false);
            }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 15 },
  subtitle: { fontSize: 20, fontWeight: "600", marginTop: 20 },
  activity: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  activityType: { fontWeight: "700" },
  date: { fontSize: 12, color: "#666", marginTop: 5 },
});
