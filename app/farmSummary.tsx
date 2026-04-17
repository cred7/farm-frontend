import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FarmActivityModal from "../components/FarmactivityModal";
import FarmActivity from "../components/websocket";
import { apiFetch, AuthExpiredError } from "../services/fetch";
type MLResult = {
  severity: "low" | "medium" | "high";
  pest_type: string;
  confidence: number;
  pest_detected: boolean;
  recommendation: string;
};
type Activity = {
  id: number;
  activity_type: "PLANTING" | "SPRAYING" | "HARVEST" | "FERTILIZING" | "OTHER";
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
  image?: string;
  status?: "PENDING" | "DONE" | "FAILED";
  ml_result?: MLResult;
};

type FarmSummary = {
  id: number;
  name: string;
  area_m2: number;
  hectares: number;
  acres: number;
  crop_type?: string;
  points_count?: number;
  expected_yield?: number;
  activities: Activity[] | null;
};

export default function FarmSummaryScreen() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [summary, setSummary] = useState<FarmSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const startWsRef = useRef<() => void>(() => {});
  const [isOpen, setIsOpen] = useState(false);
  // filters
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // 🔥 FETCH
  const fetchSummary = async (id: string) => {
    setLoading(true);

    try {
      const res = await apiFetch(`farms/${id}/summary/`);
      const data = await res.json();
      setSummary(data);
      console.log("Fetched summary:", data);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        Alert.alert("Session expired", "Please log in again");
        router.replace("/login");
      }
    }

    setLoading(false);
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

  // 🔥 EDIT
  const editActivity = async (id: number) => {
    try {
      await apiFetch(`farms/${farmId}/update_activity/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activity_id: id,
          description: editingText,
        }),
      });

      setEditingId(null);
      setEditingText("");
      fetchSummary(farmId!);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        Alert.alert("Session expired", "Please log in again");
        router.replace("/login");
        return;
      }
      Alert.alert("Error", "Update failed");
    }
  };

  // 🔥 DELETE
  const deleteActivity = (id: number) => {
    const proceedToDelete = async () => {
      try {
        await apiFetch(`farms/${farmId}/delete_activity/`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ activity_id: id }),
        });

        fetchSummary(farmId!);
      } catch (e) {
        if (e instanceof AuthExpiredError) {
          Alert.alert("Session expired", "Please log in again");
          router.replace("/login");
          return;
        }
        Alert.alert("Error", "Delete failed");
      }
    };

    // WEB
    if (Platform.OS === "web") {
      const ok = window.confirm("Delete Activity?");
      if (ok) proceedToDelete();
      return;
    }

    // MOBILE (Android/iOS)
    Alert.alert(
      "Delete Activity",
      "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: proceedToDelete,
        },
      ],
      { cancelable: true },
    );
  };

  // 🔥 FILTER + SORT
  const filteredActivities = useMemo(() => {
    if (!summary?.activities || summary?.activities.length === 0) return [];

    return (summary?.activities)
      .filter((a) => {
        if (!a) return false;
        if (typeFilter !== "ALL" && a.activity_type !== typeFilter)
          return false;

        const d = a.created_at ? new Date(a.created_at).getTime() : 0;

        if (startDate && d < new Date(startDate).getTime()) return false;
        if (endDate && d > new Date(endDate).getTime()) return false;

        return true;
      })
      .sort((a, b) => {
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        return db - da;
      });
  }, [summary, typeFilter, startDate, endDate]);

  // 🔥 STATS
  const stats = useMemo(() => {
    if (!summary || !summary.activities || summary.activities.length === 0)
      return null;

    return {
      total: summary.activities.length,
      latest: summary.activities[0] ?? null,
    };
  }, [summary]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Farm Summary</Text>

      {loading && <ActivityIndicator />}

      {summary && (
        <>
          {/* STATS */}
          {stats && stats.latest ? (
            <View style={styles.stats}>
              <Text>Total Activities: {stats.total}</Text>
              <Text>
                Latest:{" "}
                {stats.latest.created_at
                  ? new Date(stats.latest.created_at).toLocaleDateString()
                  : "N/A"}{" "}
                - {stats.latest.activity_type ?? "N/A"}
              </Text>
            </View>
          ) : (
            <View style={styles.stats}>
              <Text>Total Activities: {summary.activities?.length ?? 0}</Text>
              <Text>Latest: N/A</Text>
            </View>
          )}

          {/* FILTERS */}
          <View style={styles.filters}>
            <Text>Type</Text>
            <TextInput
              placeholder="PLANTING / SPRAYING..."
              value={typeFilter === "ALL" ? "" : typeFilter}
              onChangeText={(t) => setTypeFilter(t || "ALL")}
              style={styles.input}
            />

            <Text>Start Date</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
              style={styles.input}
            />

            <Text>End Date</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
              style={styles.input}
            />
          </View>

          <Button title="Add Activity" onPress={() => setModalVisible(true)} />

          {/* TIMELINE */}
          <Text style={styles.subtitle}>Timeline</Text>

          {filteredActivities.length === 0 && <Text>No activities found</Text>}

          {filteredActivities.map((a) => (
            <View key={a.id} style={styles.activity}>
              <Text style={styles.activityType}>{a.activity_type}</Text>

              {/* IMAGE DISPLAY */}
              {a.image && (
                <Image
                  source={{ uri: a.image }}
                  style={styles.image}
                  resizeMode="cover"
                />
              )}

              {editingId === a.id ? (
                <>
                  <TextInput
                    value={editingText}
                    onChangeText={setEditingText}
                    style={styles.input}
                  />
                  <Button title="Save" onPress={() => editActivity(a.id)} />
                </>
              ) : (
                <Text>{a.description}</Text>
              )}

              <Text style={styles.date}>
                {a.created_at
                  ? new Date(a.created_at).toLocaleString()
                  : "No date"}
              </Text>
              <Text>{a.status}</Text>
              {a.ml_result && (
                <Text>
                  ML Result:{" "}
                  {a.ml_result.pest_detected
                    ? `Pest: ${a.ml_result.pest_type} (Confidence: ${(
                        a.ml_result.confidence * 100
                      ).toFixed(
                        2,
                      )}%) severity: ${a.ml_result.severity.toUpperCase()} - Recommendation: ${a.ml_result.recommendation}`
                    : "No pest detected"}
                </Text>
              )}

              <View style={styles.actions}>
                <Button
                  title="Edit"
                  onPress={() => {
                    setEditingId(a.id);
                    setEditingText(a.description);
                  }}
                />
                <Button title="Delete" onPress={() => deleteActivity(a.id)} />
              </View>
            </View>
          ))}

          <FarmActivityModal
            farmId={farmId!}
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onWebSocketStart={() => {
              startWsRef.current();
            }}
          />
        </>
      )}

      {farmId && (
        <View style={styles.toastBackground}>
          <FarmActivity
            farmId={farmId!}
            isOpen={() => setIsOpen(true)}
            onRegisterStart={(fn) => {
              startWsRef.current = fn;
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toastBackground: {
    position: "absolute",
    top: 50, // push it down from status bar
    right: 16, // not glued to edge
    zIndex: 1000, // make sure it floats above everything
    elevation: 10, // Android shadow
  },
  toast: {
    minWidth: 180,
    maxWidth: 260,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2e3de2cb", // dark toast
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    color: "white",
  },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 15 },
  subtitle: { fontSize: 20, fontWeight: "600", marginTop: 20 },

  stats: {
    padding: 10,
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    marginBottom: 10,
  },

  filters: { marginBottom: 15 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 6,
    marginBottom: 8,
    borderRadius: 6,
  },

  activity: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
  },

  activityType: { fontWeight: "700", marginBottom: 4 },

  image: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },

  date: { fontSize: 12, color: "#666", marginTop: 5 },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
