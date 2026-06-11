import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { WebView } from 'react-native-webview'
import { Asset } from 'expo-asset'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/posetracker.style'
import api from '../lib/axios'

export default function PoseTracker() {
  const { exercise = "squat" } = useLocalSearchParams();

  const [htmlUri, setHtmlUri] = useState(null);
  const [count, setCount] = useState(0);
  const [posture, setPosture] = useState("");
  const [formGood, setFormGood] = useState(null);
  const [saving, setSaving] = useState(false);

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
        <Text style={styles.headerTitle}>AR — {exercise}</Text>
        <View style={{ width: 24 }} />
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
    </View>
  );
}