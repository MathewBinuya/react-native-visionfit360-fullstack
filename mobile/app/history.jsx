import { View, Text, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/history.style'
import api from '../lib/axios'

export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuWorkout, setMenuWorkout] = useState(null);  

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

  const totalVolume = (w) => {
    let total = 0;
    w.exercises?.forEach((ex) => {
      ex.sets?.forEach((s) => { total += (s.reps || 0) * (s.weightKg || 0); });
    });
    return total;
  };

  const confirmDelete = (id, title) => {
    setMenuWorkout(null);  
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

  // DO IT AGAIN — duplicates the workout as a new active session
  const doItAgain = async (w) => {
    setMenuWorkout(null);  
    try {
      await api.post("/workouts", {
        title: w.title || "Workout",
        date: new Date().toISOString(),
        exercises: w.exercises?.map((ex) => ({
          name: ex.name,
          sets: ex.sets?.map((s) => ({
            reps: s.reps || 0,
            weightKg: s.weightKg || 0,
            restSeconds: s.restSeconds || 60,
            completed: false,   // reset — it's a new session
          })),
        })) || [],
        completed: false,
        notes: "",
      });
      Alert.alert(
        "Added to Workout! 💪",
        `"${w.title || "Workout"}" is ready in your tracker.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to duplicate workout");
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
              {/* title + date + ⋮ menu button */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{w.title || "Workout"}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(w.completedAt || w.date).toLocaleDateString()}
                  </Text>
                </View>
                {/* THREE DOTS button */}
                <TouchableOpacity
                  onPress={() => setMenuWorkout(w)}
                  hitSlop={10}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={COLORS.placeholderText} />
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

      {/* ⋮ MENU MODAL */}
      <Modal
        visible={!!menuWorkout}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuWorkout(null)}
      >
        {/* backdrop — tap outside to close */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
          activeOpacity={1}
          onPress={() => setMenuWorkout(null)}
        >
          {/* menu card — centered */}
          <View style={{
            position: 'absolute',
            bottom: 80, left: 24, right: 24,
            backgroundColor: COLORS.white,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            overflow: 'hidden',
          }}>
            {/* workout name header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.black }}>
                {menuWorkout?.title || "Workout"}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
                {menuWorkout ? new Date(menuWorkout.completedAt || menuWorkout.date).toLocaleDateString() : ''}
              </Text>
            </View>

            {/* DO IT AGAIN option */}
            <TouchableOpacity
              onPress={() => doItAgain(menuWorkout)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
              }}
            >
              <Ionicons name="refresh-outline" size={20} color={COLORS.button} />
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.button }}>
                  Do this again
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 1 }}>
                  Copy to today's workout tracker
                </Text>
              </View>
            </TouchableOpacity>

            {/* DELETE option */}
            <TouchableOpacity
              onPress={() => confirmDelete(menuWorkout?._id, menuWorkout?.title)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16,
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#E24B4A" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#E24B4A' }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}