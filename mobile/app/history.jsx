import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/history.style'
import api from '../lib/axios'

export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.get("/workouts?completed=true");
      setWorkouts(res.data);
    } catch (error) {
      console.log("Failed to load history", error.message);
    } finally {
      setLoading(false);
    }
  };

  // total volume = sum of reps × weight across all sets
  const totalVolume = (w) => {
    let total = 0;
    w.exercises?.forEach((ex) => {
      ex.sets?.forEach((s) => {
        total += (s.reps || 0) * (s.weightKg || 0);
      });
    });
    return total;
  };

  const confirmDelete = (id, title) => {
    Alert.alert(
      "Delete workout",
      `Remove "${title || "this workout"}" from your history?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteWorkout(id) },
      ]
    );
  };

  const deleteWorkout = async (id) => {
    try {
      await api.delete(`/workouts/${id}`);
      setWorkouts((prev) => prev.filter((w) => w._id !== id));
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {workouts.length === 0 ? (
          <Text style={styles.empty}>
            {loading ? "Loading..." : "No completed workouts yet"}
          </Text>
        ) : (
          workouts.map((w) => (
            <View key={w._id} style={styles.historyCard}>
              {/*   title + date + delete */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{w.title || "Workout"}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(w.completedAt || w.date).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(w._id, w.title)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.placeholderText} />
                </TouchableOpacity>
              </View>

              {/* total volume stat */}
              <View style={styles.volumeBadge}>
                <Ionicons name="barbell-outline" size={14} color={COLORS.button} />
                <Text style={styles.volumeText}>
                  Total volume: {totalVolume(w).toLocaleString()} kg
                </Text>
              </View>

              {/* exercises with per-set detail */}
              {w.exercises?.map((ex, i) => (
                <View key={i} style={styles.exerciseBlock}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  {ex.sets?.map((s, si) => (
                    <Text key={si} style={styles.setLine}>
                      Set {si + 1}: {s.reps || 0} × {s.weightKg || 0} kg
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}