import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { showAlert } from '../components/AppAlert'
import { useState, useEffect } from 'react'
import { goBack } from '../lib/nav'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/history.style'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import { getPendingAsHistory, mergeHistory, onSyncComplete } from '../lib/offlineWorkouts'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { kgToLb, unitPrefKey } from '../lib/units'

// A workout's real date is when it was completed, falling back to its scheduled
// date; invalid/missing dates sort to the bottom.
const workoutTime = (w) => {
  const t = new Date(w.completedAt || w.date).getTime();
  return isNaN(t) ? 0 : t;
};

// Relative date bucket used for the section headers. Because the list is already
// sorted by date, items in the same bucket are adjacent, so a header is emitted
// whenever the label changes — works for both newest- and oldest-first order.
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const bucketLabel = (d) => {
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Earlier this week";
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return "Earlier this month";
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export default function History() {
  const user = useAuthStore((s) => s.user);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuWorkout, setMenuWorkout] = useState(null);
  const [expanded, setExpanded] = useState({}); // { [workoutId]: true } — which cards are open
  const [weightUnit, setWeightUnit] = useState("kg"); // mirror the user's kg/lb preference
  const [sortDir, setSortDir] = useState("desc");      // 'desc' = newest first, 'asc' = oldest first

  const toggleExpanded = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    loadHistory();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(unitPrefKey(user?.id));
        const p = raw ? JSON.parse(raw) : null;
        if (p?.weight === "lb" || p?.weight === "kg") setWeightUnit(p.weight);
      } catch (_e) {}
    })();
    // Refresh once a background sync turns a pending item into a real record.
    const off = onSyncComplete(() => { loadHistory(); });
    return off;
  }, []);

  // weights are stored in kg; show them in the user's chosen unit (0 stays 0, not blank).
  const showWeight = (kg) => {
    const n = Number(kg) || 0;
    if (!n) return 0;
    return weightUnit === "lb" ? kgToLb(n) : n;
  };

  const loadHistory = async () => {
    // Workouts completed offline live in the pending queue until they sync — show
    // them here too (badged), so history reflects everything the user has done.
    const pending = await getPendingAsHistory(user);
    try {
      const res = await api.get("/workouts?completed=true");
      setWorkouts(mergeHistory(res.data, pending));
    } catch (error) {
      console.log("Failed to load history", error.message);
      // Offline: still show what's completed locally.
      setWorkouts(pending);
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
    showAlert(
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
      showAlert("Error", error.response?.data?.message || "Failed to delete");
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
      showAlert(
        "Added to Workout! 💪",
        `"${w.title || "Workout"}" is ready in your tracker.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      showAlert("Error", error.response?.data?.message || "Failed to duplicate workout");
    }
  };

  // sorted list + section rows (header rows inserted when the date bucket changes)
  const ordered = [...workouts].sort((a, b) =>
    sortDir === "desc" ? workoutTime(b) - workoutTime(a) : workoutTime(a) - workoutTime(b)
  );
  const rows = [];
  let lastBucket = null;
  ordered.forEach((w) => {
    const b = bucketLabel(new Date(workoutTime(w)));
    if (b !== lastBucket) { rows.push({ type: "header", label: b, key: "h-" + b }); lastBucket = b; }
    rows.push({ type: "card", w, key: w._id });
  });

  const renderCard = (w) => {
    const isOpen = !!expanded[w._id];
    const exCount = w.exercises?.length || 0;
    const vol = Number(showWeight(totalVolume(w)));
    const dateStr = new Date(workoutTime(w)).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return (
      <TouchableOpacity
        key={w._id}
        style={styles.historyCard}
        activeOpacity={0.75}
        onPress={() => toggleExpanded(w._id)}
      >
        <View style={styles.cardTop}>
          {/* icon anchor — gives each row a visual anchor instead of plain text */}
          <View style={styles.iconBadge}>
            <Ionicons name="barbell-outline" size={18} color={COLORS.button} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{w.title || "Workout"}</Text>
            <Text style={styles.cardMeta}>
              {dateStr} · {exCount} {exCount === 1 ? "exercise" : "exercises"}
            </Text>
          </View>

          {!w._pending && (
            <TouchableOpacity
              onPress={() => setMenuWorkout(w)}
              hitSlop={10}
              style={{ padding: 4 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.placeholderText} />
            </TouchableOpacity>
          )}
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={COLORS.placeholderText}
            style={{ marginLeft: 2 }}
          />
        </View>

        {/* glanceable summary chips (distinct per workout, so the list isn't repetitive) */}
        <View style={styles.chipsRow}>
          {vol > 0 && (
            <View style={styles.chip}>
              <Ionicons name="trending-up-outline" size={13} color={COLORS.button} />
              <Text style={styles.chipText}>{vol.toLocaleString()} {weightUnit} volume</Text>
            </View>
          )}
          {w._pending && (
            <View style={[styles.chip, styles.chipWarn]}>
              <Ionicons name="cloud-upload-outline" size={13} color="#9A6400" />
              <Text style={[styles.chipText, { color: "#9A6400" }]}>Saved offline · will sync</Text>
            </View>
          )}
        </View>

        {/* expanded detail — per-exercise set breakdown */}
        {isOpen && (
          <View style={styles.detail}>
            {w.exercises?.map((ex, i) => (
              <View key={i} style={styles.exerciseBlock}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                {ex.sets?.map((s, si) => (
                  <Text key={si} style={styles.setLine}>
                    Set {si + 1}: {s.reps || 0} × {showWeight(s.weightKg)} {weightUnit}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout History</Text>
        {/* SORT TOGGLE — newest ⇄ oldest */}
        {workouts.length > 0 ? (
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            hitSlop={8}
          >
            <Ionicons name="swap-vertical" size={14} color={COLORS.button} />
            <Text style={styles.sortText}>{sortDir === "desc" ? "Newest" : "Oldest"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
        {workouts.length === 0 ? (
          <Text style={styles.empty}>
            {loading ? "Loading..." : "No completed workouts yet"}
          </Text>
        ) : (
          rows.map((row) =>
            row.type === "header" ? (
              <Text key={row.key} style={styles.sectionHeader}>{row.label}</Text>
            ) : (
              renderCard(row.w)
            )
          )
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
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
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
                  {"Copy to today's workout tracker"}
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
