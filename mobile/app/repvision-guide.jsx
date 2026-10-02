import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/repvisionguide.style'
import { AR_EXERCISES } from '../lib/exercises'
import { fetchExerciseDemo, DEMO_ATTRIBUTION } from '../lib/exerciseDemo'

// what the coloured camera border means (shown once, shared by every exercise)
const BORDER_LEGEND = [
  { color: "#1DB954", label: "Green", text: "Rep counted — good form." },
  { color: "#E24B4A", label: "Red", text: "Form problem — rep not counted." },
  { color: "#E0A526", label: "Amber", text: "Position unclear or app not ready yet." },
];

export default function RepVisionGuide() {
  // `from=ar` means we were opened on top of a live AR session.
  const { exercise = "squat", from } = useLocalSearchParams();
  const openedFromAr = from === "ar";

  const found = AR_EXERCISES.find((e) => e.key === exercise);
  const unknownKey = !found;
  if (unknownKey) {
    // make an unknown key visible instead of silently showing Squat
    console.warn(`[RepVisionGuide] unknown exercise key "${exercise}" — falling back to ${AR_EXERCISES[0].key}`);
  }
  const ex = found || AR_EXERCISES[0];

  const { width } = useWindowDimensions();

  // Live demo from AscendAPI. status: 'none' (no mapping) | 'loading' | 'ready' | 'failed'
  const ascendId = ex.ascend?.id || null;
  const [demo, setDemo] = useState(null);
  const [status, setStatus] = useState(ascendId ? "loading" : "none");

  const loadDemo = useCallback(async () => {
    if (!ascendId) { setStatus("none"); return; }
    setStatus("loading");
    const result = await fetchExerciseDemo(ascendId); // fresh every time (free tier: no caching)
    if (result) { setDemo(result); setStatus("ready"); }
    else { setDemo(null); setStatus("failed"); }
  }, [ascendId]);

  useEffect(() => { loadDemo(); }, [loadDemo]);

  // specific muscles, falls back to the group if no target is set
  const targetMuscles = ex.target?.length ? ex.target : [ex.group];
  // responsive demo size: square, capped so it never dominates big screens
  // free-tier GIFs are 180x180 — keep the upscale modest so they stay sharp
  const demoSize = Math.min(width - 40, 260);

  const onStart = () => {
    // Opened from the AR screen → go BACK to the existing session (never spawn a
    // second AR instance). Opened from the exercise list → push the tracker.
    if (openedFromAr) router.back();
    else router.push(`/posetracker?exercise=${ex.key}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to do it</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {unknownKey && (
          <View style={styles.warnBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#854f0b" />
            <Text style={styles.warnText}>
              Unknown exercise {`"${String(exercise)}"`}. Showing {ex.label} instead.
            </Text>
          </View>
        )}

        <View style={styles.iconWrap}>
          <Ionicons name={ex.icon} size={48} color={COLORS.button} />
        </View>
        <Text style={styles.title}>{ex.label}</Text>
        <Text style={styles.group}>{ex.group} · Target: {ex.targetReps} reps</Text>

        {/* equipment */}
        {!!ex.equipment && (
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="barbell-outline" size={14} color={COLORS.button} />
              <Text style={styles.metaChipText}>{ex.equipment}</Text>
            </View>
          </View>
        )}

        {/* demo — live from AscendAPI; graceful fallback if unmapped/offline */}
        <View style={[styles.demoBox, { width: demoSize, height: demoSize }]}>
          {status === "ready" && demo ? (
            <Image
              source={{ uri: demo.gifUrl }}
              style={styles.demoImage}
              contentFit="contain"
              cachePolicy="none"
              autoplay
              onError={() => setStatus("failed")}
              accessibilityLabel={`${ex.label} demonstration`}
            />
          ) : status === "loading" ? (
            <View style={styles.demoPlaceholder}>
              <ActivityIndicator color={COLORS.button} />
              <Text style={styles.demoPlaceholderText}>Loading demo…</Text>
            </View>
          ) : status === "failed" ? (
            <TouchableOpacity style={styles.demoPlaceholder} onPress={loadDemo} activeOpacity={0.7}>
              <Ionicons name="cloud-offline-outline" size={36} color={COLORS.placeholderText} />
              <Text style={styles.demoPlaceholderText}>{"Couldn't load the demo"}</Text>
              <Text style={styles.demoRetryText}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.demoPlaceholder}>
              <Ionicons name={ex.icon} size={40} color={COLORS.placeholderText} />
              <Text style={styles.demoPlaceholderText}>Demo coming soon</Text>
            </View>
          )}
        </View>
        {status === "ready" && (
          <Text style={styles.creditText}>
            {ex.ascend?.approx && demo?.name ? `Closest available demo: "${demo.name}". ` : ""}
            {DEMO_ATTRIBUTION}
          </Text>
        )}

        {/* target muscles */}
        <Text style={styles.sectionHeading}>Target muscles</Text>
        <View style={styles.muscleWrap}>
          {targetMuscles.map((muscle) => (
            <View key={muscle} style={styles.muscleChip}>
              <Ionicons name={ex.icon} size={14} color={COLORS.button} />
              <Text style={styles.muscleChipText}>{muscle}</Text>
            </View>
          ))}
        </View>

        {/* step-by-step instructions */}
        {!!ex.instructions?.length && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsHeading}>How to perform it</Text>
            {ex.instructions.map((step, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.tipText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* setup & form tips (unchanged content) */}
        {!!ex.tips?.length && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsHeading}>Setup & form tips</Text>
            {ex.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.bullet} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* shared: setup + what the border colours mean */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsHeading}>Setup & border colours</Text>
          {[
            "Place your phone at about hip height.",
            "Stand about 2–3 m away so your full body and head are in frame.",
            "Turn side-on for the deadlift.",
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.bullet} />
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}

          <View style={{ height: 8 }} />
          {BORDER_LEGEND.map((row) => (
            <View key={row.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: row.color }]} />
              <Text style={styles.tipText}>
                <Text style={{ fontWeight: "700" }}>{row.label}</Text> — {row.text}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={onStart}>
          <Ionicons name="camera" size={20} color={COLORS.white} />
          <Text style={styles.startText}>
            {openedFromAr ? "Back to RepVision" : "Start RepVision"}
          </Text>
        </TouchableOpacity>

        {/* Attribution for the optional spine-posture model (CC-BY-NC-4.0). Required when the model is
            enabled; the experimental deadlift spine check is OFF by default and in commercial builds.
            NOTE: there is no dedicated About screen yet — move this there if/when one is added. */}
        <Text style={styles.creditText}>
          Experimental deadlift back-posture check uses “SpinePose” keypoint weights © their authors,
          licensed CC-BY-NC-4.0 (non-commercial, attribution). Disabled by default.
        </Text>
      </ScrollView>
    </View>
  );
}
