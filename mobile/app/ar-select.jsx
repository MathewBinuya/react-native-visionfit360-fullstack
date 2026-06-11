import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/arselect.style'
import { AR_EXERCISES } from '../lib/exercises'


export default function ArSelect() {
  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Pick an exercise to track with your camera</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {AR_EXERCISES.map((ex) => (
          <TouchableOpacity
            key={ex.key}
            style={styles.card}
            onPress={() => router.push(`/posetracker?exercise=${ex.key}`)}
          >
            <Ionicons name={ex.icon} size={30} color={COLORS.button} />
            <Text style={styles.cardLabel}>{ex.label}</Text>
            <Text style={styles.cardGroup}>{ex.group}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}