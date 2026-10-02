import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react'
import { useIsFocused } from '@react-navigation/native'
import { router, useLocalSearchParams } from 'expo-router'
import { WebView } from 'react-native-webview'
import { Asset } from 'expo-asset'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/posetracker.style'
import api from '../lib/axios'
import { sendHeartbeat } from '../lib/heartbeat'
import { useAuthStore } from '../store/authStore'
import { useAlert } from '../components/AppAlert'

export default function PoseTracker() {
  const insets = useSafeAreaInsets();
  const routeParams = useLocalSearchParams();
  const exercise = routeParams.exercise || "squat";
  // Optional dev/tuning params forwarded to the WebView (absent in normal use, so nothing changes):
  // debug HUD, back-rounding tuning, and recording flags. e.g. /posetracker?exercise=deadlift&debug=1&shrinkmin=0.95
  const WEBVIEW_PASSTHROUGH = ['debug', 'ui', 'shrinkmin', 'rounddev', 'variant', 'angles', 'dlrec', 'dlrecframe', 'dlsev', 'person', 'dlmode', 'dlvar'];
  const extraQS = WEBVIEW_PASSTHROUGH
    .filter((k) => routeParams[k] != null && routeParams[k] !== "")
    .map((k) => `&${k}=${encodeURIComponent(routeParams[k])}`)
    .join("");
  const user = useAuthStore((s) => s.user);
  const isFocused = useIsFocused();
  const alert = useAlert();

  const [htmlUri, setHtmlUri] = useState(null);
  const [count, setCount] = useState(0);
  const [badCount, setBadCount] = useState(0);       // bad-form reps (from the detector)
  const [formGood, setFormGood] = useState(null);    // tracked for analytics; not rendered (border shows form)
  const [saving, setSaving] = useState(false);

  // first-use popup — once per account (mirrors the AI Coach guide pattern)
  const [showPopup, setShowPopup] = useState(false);
  const popupKey = `hasSeenRepVisionGuide:${user?.id || "unknown"}`;

  // --- RN-only rep gating (NO MediaPipe edits) -----------------------------
  // The WebView keeps running (and counting) while the guide/popup is on top.
  // `counter` messages carry an ABSOLUTE count, so we discard reps that happen
  // while counting is paused instead of letting them jump the total on return.
  const rawRef = useRef(0);        // latest absolute count from the WebView
  const ignoredRef = useRef(0);    // reps to discard (done while paused)
  const activeRef = useRef(false); // are we currently counting?
  const pausedRawRef = useRef(0);  // raw count captured when we paused

  // counting is active only when focused AND the popup is closed
  const countingActive = isFocused && !showPopup && !!htmlUri;

  useEffect(() => {
    if (countingActive && !activeRef.current) {
      // resume: discard whatever was counted while paused
      ignoredRef.current += Math.max(0, rawRef.current - pausedRawRef.current);
      activeRef.current = true;
      setCount(Math.max(0, rawRef.current - ignoredRef.current));
    } else if (!countingActive && activeRef.current) {
      // pause: remember where the raw count was
      pausedRawRef.current = rawRef.current;
      activeRef.current = false;
    }
  }, [countingActive]);

  // load the bundled HTML file
  useEffect(() => {
    sendHeartbeat(); // workout start -> mark user active
    (async () => {
      const asset = Asset.fromModule(require('../assets/posedetect.html'));
      await asset.downloadAsync();
      setHtmlUri(asset.localUri || asset.uri);
    })();
  }, []);

  // show the one-time popup (skip silently if storage fails — never block AR)
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(popupKey);
        if (!seen) setShowPopup(true);
      } catch (_e) {}
    })();
  }, [popupKey]);

  const dismissPopup = async () => {
    setShowPopup(false);
    try {
      await AsyncStorage.setItem(popupKey, "true");
    } catch (_e) {}
  };

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "counter") {
        // gate: only advance the displayed/saved count while counting is active
        const raw = data.current_count || 0;
        rawRef.current = raw;
        if (activeRef.current) setCount(Math.max(0, raw - ignoredRef.current));
      } else if (data.type === "form") {
        // Kept for analytics only — form feedback is shown by the in-camera border, not as text here.
        setFormGood(data.state === "good" ? true : data.state === "bad" ? false : null);
      } else if (data.type === "bad_rep") {
        // running count of reps the detector rejected for bad form — persisted for analytics
        setBadCount(data.current_bad || 0);
      } else if (data.type === "error") {
        // Camera/model failure: show it OUTSIDE the camera view (never a silent black screen).
        alert(
          "Camera unavailable",
          data.message || "Something went wrong starting the camera.",
          [{ text: "Go back", onPress: () => router.back() }]
        );
      }
      // 'countdown', 'ar_started', 'dl_*' are received but intentionally not shown as text.
    } catch (_e) {}
  };

  const openGuide = () => {
    // push (not replace) with from=ar so the guide's button returns HERE
    router.push(`/repvision-guide?exercise=${exercise}&from=ar`);
  };

  const finishSession = async () => {
    if (count === 0) {
      alert("No reps yet", "Do some reps before finishing.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/workouts", {
        title: `${exercise.charAt(0).toUpperCase() + exercise.slice(1)} session (AR)`,
        exercises: [
          { name: exercise, sets: [{ reps: count, weightKg: 0, goodReps: count, badReps: badCount }] },
        ],
        completed: true,
        completedAt: new Date(),
      });
      sendHeartbeat(); // workout finish -> mark user active
      alert("Saved!", `${count} ${exercise}s recorded.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      alert("Error", error.response?.data?.message || "Failed to save");
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        {/* "How to do it" — opens the demo + instructions for this exact exercise */}
        <TouchableOpacity style={styles.howBtn} onPress={openGuide} activeOpacity={0.8}>
          <Ionicons name="play-circle-outline" size={18} color={COLORS.white} />
          <Text style={styles.howBtnText}>How to do it</Text>
        </TouchableOpacity>
        {/* help icon — opens the full exercise guide for this key */}
        <TouchableOpacity onPress={openGuide} hitSlop={10}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      {/* Form-feedback banner removed: the in-camera coloured border now carries all form feedback
          (green = counted, red = not counted, amber = unclear / not ready). */}

      <View style={styles.webviewWrap}>
        <WebView
          source={{ uri: `${htmlUri}?exercise=${exercise}${extraQS}` }}
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

      <TouchableOpacity
        style={[styles.finishBtn, saving && { opacity: 0.6 }, { marginBottom: insets.bottom + 12 }]}
        onPress={finishSession}
        disabled={saving}
      >
        <Text style={styles.finishText}>{saving ? "Saving..." : "Finish & Save"}</Text>
      </TouchableOpacity>

      {/* FIRST-USE POPUP — once per account, above the AR view, single button.
          While visible, rep counting is gated off (see countingActive), so a
          countdown that runs behind it can't count reps the user didn't intend. */}
      {showPopup && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupIcon}>
              <Ionicons name="help-circle-outline" size={26} color={COLORS.white} />
            </View>
            <Text style={styles.popupTitle}>Need help with this exercise?</Text>
            <Text style={styles.popupText}>
              {"Tap the ? button in the top-right corner to see the demonstration, target muscles, instructions and form tips. You'll also find setup tips and what the border colours mean."}
            </Text>
            <TouchableOpacity style={styles.popupBtn} onPress={dismissPopup}>
              <Text style={styles.popupBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
