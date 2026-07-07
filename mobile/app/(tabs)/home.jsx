import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/tabStyle/home.style'
import api from '../../lib/axios'
import { useAuthStore } from '../../store/authStore'

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const [workouts, setWorkouts] = useState([]);

  // reload completed workouts every time home comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  const loadWorkouts = async () => {
    try {
      const res = await api.get("/workouts?completed=true");
      setWorkouts(res.data);
    } catch (error) {
      console.log("Failed to load workouts", error.message);
    }
  };

  //   derived stats 
  const workoutsDone = workouts.length;

  const volumeThisWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let total = 0;
    workouts.forEach((w) => {
      const when = new Date(w.completedAt || w.date);
      if (when >= oneWeekAgo) {
        w.exercises?.forEach((ex) =>
          ex.sets?.forEach((s) => {
            total += (s.reps || 0) * (s.weightKg || 0);
          })
        );
      }
    });
    return total;
  };

  // BMI from stored height/weight
  const bmiData = () => {
    if (!user?.heightCm || !user?.weightKg) return null;
    const h = user.heightCm / 100;
    const bmi = +(user.weightKg / (h * h)).toFixed(1);
    let category = "Obese";
    if (bmi < 18.5) category = "Underweight";
    else if (bmi < 25) category = "Normal";
    else if (bmi < 30) category = "Overweight";
    return { bmi, category };
  };

  const workoutVolume = (w) => {
    let total = 0;
    w.exercises?.forEach((ex) =>
      ex.sets?.forEach((s) => {
        total += (s.reps || 0) * (s.weightKg || 0);
      })
    );
    return total;
  };

  const bmi = bmiData();
  const recent = workouts.slice(0, 2);

  const bmiColor = (cat) => {
    if (cat === "Normal") return COLORS.button;
    if (cat === "Underweight" || cat === "Overweight") return "#854f0b";
    return "#a32d2d";
  };

  return (
    <View style={styles.container}>
      {/* profile */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.username}>{user?.name || user?.username || "there"}</Text>
        </View>
        <View style={styles.topBarRight}>
          {/* Notifications bell — parked until dev build is set up */}
          <TouchableOpacity onPress={() => router.push("/notifications")} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push("/(tabs)/profile")}
          >
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.username ? user.username.charAt(0).toUpperCase() : "?"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
    </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Workouts done</Text>
            <Text style={styles.statValue}>{workoutsDone}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Volume this week</Text>
            <Text style={styles.statValue}>
              {volumeThisWeek().toLocaleString()}
              <Text style={styles.statUnit}> kg</Text>
            </Text>
          </View>
        </View>

        {/* BMI card */}
        {bmi && (
          <View style={styles.bmiCard}>
            <View>
              <Text style={styles.bmiLabel}>Your BMI</Text>
              <Text style={styles.bmiValue}>{bmi.bmi}</Text>
            </View>
            <View style={[styles.bmiBadge, { backgroundColor: bmiColor(bmi.category) + "22" }]}>
              <Text style={[styles.bmiBadgeText, { color: bmiColor(bmi.category) }]}>
                {bmi.category}
              </Text>
            </View>
          </View>
        )}

        {/* Workout Tracker */}
        <TouchableOpacity
          style={styles.trackerCard}
          onPress={() => router.push("/workout")}
        >
          <Ionicons name="barbell" size={24} color={COLORS.white} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.trackerTitle}>Workout Tracker</Text>
            <Text style={styles.trackerSub}>Log today's session</Text>
          </View>
        </TouchableOpacity>

        {/* AR Camera (placeholder) + History (functional) */}
        <View style={styles.placeholderRow}>
        <TouchableOpacity
            style={styles.placeholder}
            onPress={() => router.push("/ar-select")}
        >
            <Ionicons name="body-outline" size={24} color={COLORS.button} />
            <Text style={styles.placeholderLabel}>RepVision</Text>
            <Text style={styles.placeholderSub}>AR rep counter</Text>
        </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push("/history")}
          >
            <Ionicons name="time-outline" size={24} color={COLORS.button} />
            <Text style={styles.historyButtonLabel}>History</Text>
            <Text style={styles.historyButtonSub}>Past sessions</Text>
          </TouchableOpacity>
        </View>

        {/* recent peek */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {workouts.length > 0 && (
            <TouchableOpacity onPress={() => router.push("/history")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        {recent.length === 0 ? (
          <Text style={styles.empty}>No workouts yet</Text>
        ) : (
          recent.map((w) => (
            <View key={w._id} style={styles.recentItem}>
              <View>
                <Text style={styles.recentTitle}>{w.title || "Workout"}</Text>
                <Text style={styles.recentSub}>
                  {w.exercises?.length || 0} exercises · {workoutVolume(w).toLocaleString()} kg
                </Text>
              </View>
              <Text style={styles.recentDate}>
                {new Date(w.completedAt || w.date).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}