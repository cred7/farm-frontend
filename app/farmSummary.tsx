import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
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

type Activity = {
  id: number;
  activity_type: "PLANTING" | "SPRAYING" | "HARVEST" | "FERTILIZING" | "OTHER";
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
  image?: string;
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
    const token = await AsyncStorage.getItem("accessToken");

    try {
      const res = await fetch(`${BACKEND_URL}farms/${id}/summary/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      console.log("Fetched summary:", data);
      setSummary(data);
    } catch (e) {
      console.error(e);
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

  // 🔥 ADD (with image)
  // const addActivity = async (
  //   type: string,
  //   description: string,
  //   image?: any,
  // ) => {
  //   const token = await AsyncStorage.getItem("accessToken");

  //   try {
  //     const res = await fetch(`${BACKEND_URL}farms/${farmId}/add_activity/`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: createFormData(type, description, image),
  //     });

  //     if (!res.ok) throw new Error();

  //     fetchSummary(farmId!);
  //   } catch {
  //     Alert.alert("Error", "Failed to add activity");
  //   }
  // };

  // 🔥 EDIT
  const editActivity = async (id: number) => {
    const token = await AsyncStorage.getItem("accessToken");

    try {
      await fetch(`${BACKEND_URL}farms/${farmId}/update_activity/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          activity_id: id,
          description: editingText,
        }),
      });

      setEditingId(null);
      setEditingText("");
      fetchSummary(farmId!);
    } catch {
      Alert.alert("Error", "Update failed");
    }
  };

  // 🔥 DELETE
  const deleteActivity = (id: number) => {
    const proceedToDelete = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");

        await fetch(`${BACKEND_URL}farms/${farmId}/delete_activity/`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ activity_id: id }),
        });

        fetchSummary(farmId!);
      } catch (e) {
        console.log(e);
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
    if (!summary) return [];

    return summary.activities
      .filter((a) => {
        if (typeFilter !== "ALL" && a.activity_type !== typeFilter)
          return false;

        const d = new Date(a.created_at).getTime();

        if (startDate && d < new Date(startDate).getTime()) return false;
        if (endDate && d > new Date(endDate).getTime()) return false;

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [summary, typeFilter, startDate, endDate]);

  // 🔥 STATS
  const stats = useMemo(() => {
    if (!summary || summary.activities.length === 0) return null;

    return {
      total: summary.activities.length,
      latest: summary.activities[0],
    };
  }, [summary]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Farm Summary</Text>

      {loading && <ActivityIndicator />}

      {summary && (
        <>
          {/* STATS */}
          {stats && (
            <View style={styles.stats}>
              <Text>Total Activities: {stats.total}</Text>
              <Text>
                Latest: {new Date(stats.latest.created_at).toLocaleDateString()}
              </Text>
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
                {new Date(a.created_at).toLocaleString()}
              </Text>

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
            // onAdded={(type, desc, image) => {
            //   addActivity(type, desc, image);
            //   setModalVisible(false);
            // }}
          />
        </>
      )}
    </ScrollView>
  );
}

// 🔥 FORM DATA (mobile + web safe)
// const createFormData = (type: string, description: string, image?: any) => {
//   const data = new FormData();

//   data.append("activity_type", type);
//   data.append("description", description);

//   if (image) {
//     if (Platform.OS === "web") {
//       data.append("image", image.file || image);
//     } else {
//       data.append("image", {
//         uri: image.uri,
//         name: "photo.jpg",
//         type: "image/jpeg",
//       } as any);
//     }
//   }

//   return data;
// };

const styles = StyleSheet.create({
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
