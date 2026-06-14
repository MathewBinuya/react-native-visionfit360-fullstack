import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native'
import { useState, useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { WebView } from 'react-native-webview'
import { Asset } from 'expo-asset'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/posetracker.style'
import api from '../lib/axios'
import { AR_EXERCISES } from '../lib/exercises'

export default function PoseTracker() {
  const { exercise = "squat" } = useLocalSearchParams();

  const [htmlUri, setHtmlUri] = useState(null);
  const [count, setCount] = useState(0);
  const [posture, setPosture] = useState("");
  const [formGood, setFormGood] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showTips, setShowTips] = useState(false);   // ← for the help modal

  // find this exercise's data (for the tips)
  const exData = AR_EXERCISES.find((e) => e.key === exercise);

  // load the bundled HTML file
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require('../assets/posedetect.html'));
      await asset.downloadAsync();
      setHtmlUri(asset.localUri || asset.uri);
    })();
  }, []);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "counter") {
        setCount(data.current_count || 0);
      } else if (data.type === "posture") {
        setFormGood(data.correct === true);
        setPosture(data.message || "");
      }
    } catch (e) {}
  };

  const finishSession = async () => {
    if (count === 0) {
      Alert.alert("No reps yet", "Do some reps before finishing.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/workouts", {
        title: `${exercise.charAt(0).toUpperCase() + exercise.slice(1)} session (AR)`,
        exercises: [{ name: exercise, sets: [{ reps: count, weightKg: 0 }] }],
        completed: true,
        completedAt: new Date(),
      });
      Alert.alert("Saved!", `${count} ${exercise}s recorded.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!htmlUri) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.button} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RepVision — {exercise}</Text>
        {/* help icon — re-shows the tips */}
        <TouchableOpacity onPress={() => setShowTips(true)}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      <View style={[
        styles.formBar,
        formGood === true && styles.formGood,
        formGood === false && styles.formBad,
      ]}>
        <Text style={styles.formBarText}>
          {formGood === null ? "Get into position..." : formGood ? "Good form ✓" : "Fix your form"}
        </Text>
      </View>

      <View style={styles.webviewWrap}>
        <WebView
          source={{ uri: `${htmlUri}?exercise=${exercise}` }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={onMessage}
          originWhitelist={["*"]}
          allowFileAccess
          allowUniversalAccessFromFileURLs
        />
      </View>

      <View style={styles.stats}>
        <View style={styles.counterBox}>
          <Text style={styles.counterLabel}>Reps</Text>
          <Text style={styles.counterValue}>{count}</Text>
        </View>
      </View>
      {posture ? <Text style={styles.postureText}>{posture}</Text> : null}

      <TouchableOpacity
        style={[styles.finishBtn, saving && { opacity: 0.6 }]}
        onPress={finishSession}
        disabled={saving}
      >
        <Text style={styles.finishText}>{saving ? "Saving..." : "Finish & Save"}</Text>
      </TouchableOpacity>

      {/* TIPS MODAL — opens when help icon tapped */}
      <Modal visible={showTips} transparent animationType="fade" onRequestClose={() => setShowTips(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 30 }}>
          <View style={{ backgroundColor: COLORS.cards, borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.black, marginBottom: 12, fontFamily: "GeneralSans-Variable" }}>
              {exData?.label || "Exercise"} — Tips
            </Text>
            {exData?.tips?.map((tip, i) => (
              <Text key={i} style={{ fontSize: 14, color: COLORS.black, marginBottom: 8, lineHeight: 20, fontFamily: "GeneralSans-Variable" }}>
                • {tip}
              </Text>
            ))}
            <TouchableOpacity
              style={{ backgroundColor: COLORS.button, borderRadius: 10, padding: 12, alignItems: "center", marginTop: 10 }}
              onPress={() => setShowTips(false)}
            >
              <Text style={{ color: COLORS.white, fontWeight: "600", fontFamily: "GeneralSans-Variable" }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}