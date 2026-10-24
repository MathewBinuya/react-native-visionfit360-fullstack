import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, BackHandler, Modal } from 'react-native'
import { useState, useCallback, useEffect } from 'react'
import { useFocusEffect } from 'expo-router'
import { goBack } from '../lib/nav'
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import COLORS from "../constants/colors"
import styles from '../assets/styles/progress.style'
import api from '../lib/axios'
import { shortDate, weekRange, manilaDate, compactKg, formatPct, formatDiff, guideSeenKey } from '../lib/progress'
import { useAuthStore } from '../store/authStore'
import { unitPrefKey, LB_TO_KG } from '../lib/units'

const PAST_BAR = "#D9D9D9";
const LIFTS_PREVIEW = 4;


const GUIDE_STEPS = [
  {
    icon: "barbell-outline",
    title: "Total weight lifted",
    text: "The total weight you moved in a week (each set's reps × weight, all added up). If it rises week over week, you're getting stronger.",
  },
  {
    icon: "swap-horizontal-outline",
    title: "Last week → this week",
    text: "The big number compares last week with this week so far. The badge shows the change, e.g. +12% means you've lifted 12% more.",
  },
  {
    icon: "stats-chart-outline",
    title: "The bars",
    text: "Each bar is one week. The darkest bar is this week. Tap any bar to see that week's dates and totals.",
  },
  {
    icon: "calendar-outline",
    title: "Workouts per week",
    text: "How many workouts you completed each week, against a target based on your usual routine. A steady row of bars means good consistency.",
  },
  {
    icon: "trophy-outline",
    title: "Heaviest lifts & records",
    text: "Your best weight for each exercise. The \"+\" figure shows how much you beat your previous best.",
  },
];

// One series, so no legend — the card title names it. Tap a bar to read its week.
function WeeklyBars({ weeks, field, selected, onSelect }) {
  const max = Math.max(1, ...weeks.map((w) => w[field]));
  return (
    <View>
      <View style={styles.chart}>
        {weeks.map((w, i) => {
          const isCurrent = i === weeks.length - 1;
          const isSelected = selected === i;
          const h = w[field] > 0 ? Math.max(4, (w[field] / max) * 100) : 0;
          return (
            <TouchableOpacity
              key={w.weekStart}
              style={styles.barCol}
              onPress={() => onSelect(isSelected ? null : i)}
              activeOpacity={0.7}
              accessibilityLabel={`${weekRange(w)}: ${w[field]}`}
            >
              <View style={[
                styles.bar,
                { height: `${h}%`, backgroundColor: isCurrent || isSelected ? COLORS.button : PAST_BAR },
              ]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.baseline} />
      <View style={styles.axisRow}>
        {weeks.map((w, i) => (
          <Text key={w.weekStart} style={styles.axisLabel} numberOfLines={1}>
            {i === weeks.length - 1 ? "This wk" : shortDate(w.weekStart)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ChangeBadge({ text }) {
  if (!text) return null;
  return (
    <View style={styles.changeBadge}>
      <Text style={styles.changeText}>{text}</Text>
    </View>
  );
}

export default function Progress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [volSel, setVolSel] = useState(null);
  const [wkSel, setWkSel] = useState(null);
  const [showAllLifts, setShowAllLifts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const user = useAuthStore((st) => st.user);
  const guideKey = guideSeenKey("progress", user);

  // kg/lb preference (set in Profile). Analytics come back in kg; convert for display only.
  const [weightUnit, setWeightUnit] = useState("kg");
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(unitPrefKey(user?.id));
        const p = raw ? JSON.parse(raw) : null;
        if (p?.weight === "lb" || p?.weight === "kg") setWeightUnit(p.weight);
      } catch {}
    })();
  }, [user?.id]);
  const uw = (kg) => (weightUnit === "lb" ? Math.round((Number(kg) || 0) / LB_TO_KG) : Math.round(Number(kg) || 0));

  // first visit only; reopenable from the header "?" button
  useEffect(() => {
    (async () => {
      try {
        if (!(await AsyncStorage.getItem(guideKey))) setShowGuide(true);
      } catch {}
    })();
  }, [guideKey]);

  const closeGuide = async () => {
    setShowGuide(false);
    try { await AsyncStorage.setItem(guideKey, "1"); } catch {}
  };

  useEffect(() => {
    if (!showGuide) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { closeGuide(); return true; });
    return () => sub.remove();
  }, [showGuide]);

  const load = async () => {
    try {
      const res = await api.get("/workouts/analytics?weeks=8");
      setData(res.data);
      setError(false);
    } catch (e) {
      console.log("Failed to load progress", e.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const s = data?.summary;
  const weeks = data?.weeks || [];

  const renderBody = () => {
    if (loading) return <ActivityIndicator size="large" color={COLORS.button} style={{ marginTop: 60 }} />;
    if (error && !data) {
      return (
        <TouchableOpacity style={styles.center} onPress={() => { setLoading(true); load(); }}>
          <Ionicons name="cloud-offline-outline" size={36} color={COLORS.placeholderText} />
          <Text style={[styles.muted, { marginTop: 8 }]}>{"Couldn't load your progress. Tap to retry."}</Text>
        </TouchableOpacity>
      );
    }
    if (!s?.totalWorkouts) {
      return (
        <View style={styles.center}>
          <Ionicons name="stats-chart-outline" size={40} color={COLORS.placeholderText} />
          <Text style={[styles.muted, { marginTop: 10 }]}>
            Complete your first workout in the Workout Tracker to start seeing weekly progress, consistency and personal records here.
          </Text>
        </View>
      );
    }

    const volSelected = volSel != null ? weeks[volSel] : null;
    const wkSelected = wkSel != null ? weeks[wkSel] : null;

    return (
      <>
        {/* weekly volume */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TOTAL WEIGHT LIFTED</Text>
          <Text style={styles.cardSub}>All the weight you lifted this week (each set's reps × weight, added up).</Text>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.hero}>
                <Text style={styles.heroFrom}>{compactKg(uw(s.lastWeek.volume))} → </Text>
                {compactKg(uw(s.thisWeek.volume))}
                <Text style={styles.heroUnit}> {weightUnit}</Text>
              </Text>
              <Text style={styles.caption}>Last week → this week so far</Text>
            </View>
            <ChangeBadge text={s.volumeChangePct != null ? formatPct(s.volumeChangePct) : null} />
          </View>
          <WeeklyBars weeks={weeks} field="volume" selected={volSel} onSelect={setVolSel} />
          {volSelected && (
            <View style={styles.readout}>
              <Text style={styles.readoutText}>
                {weekRange(volSelected)} · {uw(volSelected.volume).toLocaleString()} {weightUnit}
                {volSel > 0 && weeks[volSel - 1].volume > 0
                  ? ` · ${formatPct(Math.round(((volSelected.volume - weeks[volSel - 1].volume) / weeks[volSel - 1].volume) * 1000) / 10)} vs previous week`
                  : ""}
              </Text>
            </View>
          )}
        </View>

        {/* weekly workouts / consistency */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>WORKOUTS PER WEEK</Text>
          <Text style={styles.cardSub}>How many workouts you finished, vs. your weekly goal.</Text>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.hero}>
                <Text style={styles.heroFrom}>{s.lastWeek.workouts} → </Text>
                {s.thisWeek.workouts}
                <Text style={styles.heroUnit}> of {s.weeklyTarget} goal</Text>
              </Text>
              <Text style={styles.caption}>Last week → this week so far</Text>
            </View>
            <ChangeBadge text={s.workoutsChange !== 0 ? formatDiff(s.workoutsChange, "workout") : "Same as last week"} />
          </View>
          <WeeklyBars weeks={weeks} field="workouts" selected={wkSel} onSelect={setWkSel} />
          {wkSelected && (
            <View style={styles.readout}>
              <Text style={styles.readoutText}>
                {weekRange(wkSelected)} · {wkSelected.workouts} workout{wkSelected.workouts === 1 ? "" : "s"}
              </Text>
            </View>
          )}
          <View style={styles.statGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{s.weekStreak} week{s.weekStreak === 1 ? "" : "s"}</Text>
              <Text style={styles.statLabel}>Weeks in a row</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{s.avgWorkoutsPerWeek}</Text>
              <Text style={styles.statLabel}>Avg workouts per week</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{s.activeWeeks} of {weeks.length}</Text>
              <Text style={styles.statLabel}>Weeks you trained</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {s.mostActiveWeek ? `${s.mostActiveWeek.workouts} · ${shortDate(s.mostActiveWeek.weekStart)}` : "—"}
              </Text>
              <Text style={styles.statLabel}>Most active week</Text>
            </View>
          </View>
        </View>

        {/* recent PRs */}
        {data.recentPRs?.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { marginBottom: 4 }]}>RECENT PERSONAL RECORDS</Text>
            {data.recentPRs.map((pr, i) => (
              <View key={i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.recordRow}>
                  <View style={styles.recordTop}>
                    <Text style={styles.recordName}>{pr.exercise}</Text>
                    <Text style={styles.recordKg}>{uw(pr.weightKg)} {weightUnit}</Text>
                  </View>
                  <Text style={styles.recordSub}>
                    {manilaDate(pr.date)} · previous best {uw(pr.previousBestKg)} {weightUnit} · +{uw(pr.improvementKg)} {weightUnit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* heaviest lifts */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 4 }]}>HEAVIEST LIFTS</Text>
          {data.records.length === 0 ? (
            <Text style={[styles.muted, { textAlign: "left", marginTop: 6 }]}>
              Log sets with a weight ({weightUnit}) in the Workout Tracker to track your heaviest lifts.
            </Text>
          ) : (
            <>
              {(showAllLifts ? data.records : data.records.slice(0, LIFTS_PREVIEW)).map((r, i) => (
                <View key={r.exercise} style={[styles.liftRow, i > 0 && styles.liftRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.liftName} numberOfLines={1}>{r.exercise}</Text>
                    <Text style={styles.liftSub}>{manilaDate(r.bestDate)}</Text>
                  </View>
                  {r.improvementKg > 0 && <Text style={styles.liftGain}>+{uw(r.improvementKg)} {weightUnit}</Text>}
                  <Text style={styles.liftKg}>{uw(r.bestKg)} {weightUnit}</Text>
                </View>
              ))}
              {data.records.length > LIFTS_PREVIEW && (
                <TouchableOpacity style={styles.showMore} onPress={() => setShowAllLifts(!showAllLifts)} activeOpacity={0.7} hitSlop={6}>
                  <Text style={styles.showMoreText}>
                    {showAllLifts ? "Show fewer" : `Show all ${data.records.length} lifts`}
                  </Text>
                  <Ionicons name={showAllLifts ? "chevron-up" : "chevron-down"} size={16} color={COLORS.black} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <Text style={styles.footnote}>Weeks run Monday – Sunday</Text>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
        <TouchableOpacity onPress={() => setShowGuide(true)} hitSlop={10} accessibilityLabel="How to read your progress">
          <Ionicons name="help-circle-outline" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.button} colors={[COLORS.button]} />}
      >
        {renderBody()}
      </ScrollView>

      {/* Modal so the dim backdrop covers the whole screen uniformly (no lighter patches) */}
      <Modal visible={showGuide} transparent animationType="fade" statusBarTranslucent onRequestClose={closeGuide}>
        <View style={styles.guideOverlay}>
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>How to read your progress</Text>
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
            </ScrollView>
            <TouchableOpacity style={styles.guideBtn} onPress={closeGuide}>
              <Text style={styles.guideBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
