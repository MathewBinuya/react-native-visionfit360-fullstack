import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/repvisionguide.style'
import { AR_EXERCISES } from '../lib/exercises'

export default function RepVisionGuide() {
  const { exercise = "squat" } = useLocalSearchParams();
  const ex = AR_EXERCISES.find((e) => e.key === exercise) || AR_EXERCISES[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to do it</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.iconWrap}>
          <Ionicons name={ex.icon} size={48} color={COLORS.button} />
        </View>
        <Text style={styles.title}>{ex.label}</Text>
        <Text style={styles.group}>{ex.group} · Target: {ex.targetReps} reps</Text>

        <View style={styles.tipsBox}>
          <Text style={styles.tipsHeading}>Setup & Form</Text>
          {ex.tips?.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push(`/posetracker?exercise=${ex.key}`)}
        >
          <Ionicons name="camera" size={20} color={COLORS.white} />
          <Text style={styles.startText}>Start RepVision</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}