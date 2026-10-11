import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import COLORS from '../constants/colors'
import api from '../lib/axios'
import { shortDate, guideSeenKey } from '../lib/progress'
import { useAuthStore } from '../store/authStore'

// GitHub-style activity grid: one column per week (Mon→Sun top to bottom), one
// cell per Manila day, shaded by how many workouts were marked complete that day.
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HEAT = ["#EFEFEF", "#C9C9C9", "#7A7A7A", COLORS.button];
const heatFor = (n) => HEAT[Math.min(n, 3)];
const dayIndex = (iso) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
const isoFor = (idx) => new Date(idx * DAY_MS).toISOString().slice(0, 10);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const GUIDE_STEPS = [
  { icon: "grid-outline", title: "Each square is a day", text: "Columns are weeks, Monday at the top to Sunday at the bottom. The newest week is on the right." },
  { icon: "contrast-outline", title: "Darker = more training", text: "Light gray means no workout. The darker the square, the more workouts you completed that day." },
  { icon: "checkmark-circle-outline", title: "Only completed workouts count", text: "A square fills when you tap Mark Complete in the Workout Tracker, or save a RepVision session." },
  { icon: "flame-outline", title: "Streak", text: "Days in a row with a completed workout. It stays alive until the end of the day after your last workout." },
  { icon: "hand-left-outline", title: "Explore", text: "Tap a square to see that day's workouts. Swipe right to see earlier months." },
];

function ActivityGuide({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.guideOverlay}>
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Your activity grid</Text>
          <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
            {GUIDE_STEPS.map((step) => (
              <View key={step.title} style={styles.guideRow}>
                <View style={styles.guideIcon}>
                  <Ionicons name={step.icon} size={18} color={COLORS.black} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideStepTitle}>{step.title}</Text>
                  <Text style={styles.guideStepText}>{step.text}</Text>
                </View>
              </View>
            ))}
            <View style={styles.guideLegend}>
              <Text style={styles.legendText}>Less</Text>
              {HEAT.map((c) => <View key={c} style={[styles.guideLegendCell, { backgroundColor: c }]} />)}
              <Text style={styles.legendText}>More</Text>
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.guideBtn} onPress={onClose}>
            <Text style={styles.guideBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ActivityGrid({ calendar, selected, onSelect }) {
  const scrollRef = useRef(null);
  const start = dayIndex(calendar.start);
  const end = dayIndex(calendar.end);
  const columns = [];
  for (let col = 0; start + col * 7 <= end; col++) {
    const first = new Date((start + col * 7) * DAY_MS);
    const prev = col > 0 ? new Date((start + (col - 1) * 7) * DAY_MS) : null;
    columns.push({
      col,
      month: !prev || prev.getUTCMonth() !== first.getUTCMonth() ? MONTHS[first.getUTCMonth()] : null,
      days: Array.from({ length: 7 }, (_, r) => start + col * 7 + r),
    });
  }

  return (
    <View style={styles.gridWrap}>
      <View style={styles.dayLabels}>
        {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
          <Text key={i} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        ref={scrollRef}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <View>
          <View style={styles.monthRow}>
            {columns.map((c) => (
              <View key={c.col} style={styles.col}>
                {c.month && <Text style={styles.month} numberOfLines={1}>{c.month}</Text>}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row" }}>
            {columns.map((c) => (
              <View key={c.col} style={styles.col}>
                {c.days.map((d) => {
                  if (d > end) return <View key={d} style={[styles.cell, { backgroundColor: "transparent" }]} />;
                  const iso = isoFor(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => onSelect(selected === iso ? null : iso)}
                      hitSlop={2}
                      style={[
                        styles.cell,
                        { backgroundColor: heatFor(calendar.days[iso] || 0) },
                        selected === iso && styles.cellSelected,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Pass `calendar` when the screen already loads /workouts/analytics; otherwise
// the card fetches it itself on every focus.
export default function ActivityCard({ style, calendar: calendarProp }) {
  const [fetched, setFetched] = useState(null);
  const calendar = calendarProp !== undefined ? calendarProp : fetched;
  const [selected, setSelected] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const user = useAuthStore((st) => st.user);
  const guideKey = guideSeenKey("activity", user);

  // first time this account sees the card (only once it has data to explain)
  useEffect(() => {
    if (!calendar) return;
    (async () => {
      try {
        if (!(await AsyncStorage.getItem(guideKey))) setShowGuide(true);
      } catch {}
    })();
  }, [calendar, guideKey]);

  const closeGuide = async () => {
    setShowGuide(false);
    try { await AsyncStorage.setItem(guideKey, "1"); } catch {}
  };

  // refetch every time the screen is focused so a just-completed workout shows up
  useFocusEffect(
    useCallback(() => {
      if (calendarProp !== undefined) return;
      (async () => {
        try {
          const res = await api.get("/workouts/analytics");
          setFetched(res.data.calendar || null);
        } catch (e) {
          console.log("Failed to load activity", e.message);
        }
      })();
    }, [calendarProp])
  );

  if (!calendar) return null;
  const selectedCount = selected ? calendar.days[selected] || 0 : 0;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Activity</Text>
          <TouchableOpacity onPress={() => setShowGuide(true)} hitSlop={10} accessibilityLabel="How to read your activity">
            <Ionicons name="help-circle-outline" size={16} color={COLORS.placeholderText} />
          </TouchableOpacity>
        </View>
        <Text style={styles.summary}>
          {plural(calendar.totalWorkouts, "workout")} this year
          {calendar.currentDayStreak > 0 ? ` · ${calendar.currentDayStreak}-day streak` : ""}
        </Text>
      </View>

      <ActivityGrid calendar={calendar} selected={selected} onSelect={setSelected} />

      <View style={styles.footer}>
        <Text style={styles.caption}>
          {selected
            ? `${shortDate(selected)} · ${plural(selectedCount, "workout")}`
            : `Longest streak ${plural(calendar.longestDayStreak, "day")}`}
        </Text>
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {HEAT.map((c) => <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />)}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>
      <ActivityGuide visible={showGuide} onClose={closeGuide} />
    </View>
  );
}

const FONT = "GeneralSans-Variable";

const CELL = 10;
const GAP = 2;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cards, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  title: { fontSize: 13, fontWeight: "600", color: COLORS.black, fontFamily: FONT },
  summary: { fontSize: 11, color: COLORS.placeholderText, fontFamily: FONT },

  gridWrap: { flexDirection: "row" },
  dayLabels: { marginTop: 13, marginRight: 5 },
  dayLabel: { height: CELL, marginBottom: GAP, fontSize: 8, lineHeight: CELL, color: COLORS.placeholderText, fontFamily: FONT },
  monthRow: { flexDirection: "row", height: 13 },
  month: { position: "absolute", left: 0, width: 28, fontSize: 8, color: COLORS.placeholderText, fontFamily: FONT },
  col: { width: CELL, marginRight: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 2, marginBottom: GAP },
  cellSelected: { borderWidth: 1.5, borderColor: COLORS.black },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  caption: { fontSize: 11, color: COLORS.placeholderText, fontFamily: FONT },
  legend: { flexDirection: "row", alignItems: "center", gap: 2 },
  legendCell: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 9, color: COLORS.placeholderText, fontFamily: FONT, marginHorizontal: 2 },

  guideOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  guideCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, maxHeight: "85%" },
  guideTitle: { fontSize: 18, fontWeight: "700", color: COLORS.black, fontFamily: FONT, marginBottom: 14 },
  guideRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  guideIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.inputBackground,
    alignItems: "center", justifyContent: "center",
  },
  guideStepTitle: { fontSize: 14, fontWeight: "600", color: COLORS.black, fontFamily: FONT },
  guideStepText: { fontSize: 12, lineHeight: 18, color: "#555555", fontFamily: FONT, marginTop: 2 },
  guideLegend: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "center", marginBottom: 6 },
  guideLegendCell: { width: 14, height: 14, borderRadius: 3 },
  guideBtn: { backgroundColor: COLORS.button, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 6 },
  guideBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700", fontFamily: FONT },
});
