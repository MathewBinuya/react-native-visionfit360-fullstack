import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/arselect.style'
import { AR_EXERCISES } from '../lib/exercises'

const GRID_PADDING = 16;
const GRID_GAP = 12;
const MAX_GRID_WIDTH = 1000;

export default function ArSelect() {
  const { width } = useWindowDimensions();
  // responsive columns: 2 on phones, 3 on large phones / small tablets, 4 on tablets
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const gridWidth = Math.min(width, MAX_GRID_WIDTH);
  const cardWidth = (gridWidth - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vision Reps</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Pick an exercise to see how to do it, then track it with your camera</Text>

      <ScrollView contentContainerStyle={[styles.grid, { width: gridWidth, alignSelf: "center" }]}>
        {AR_EXERCISES.map((ex) => (
          <TouchableOpacity
            key={ex.key}
            style={[styles.card, { width: cardWidth }, ex.working === false && { opacity: 0.5 }]}
            disabled={ex.working === false}
            onPress={() => router.push(`/repvision-guide?exercise=${ex.key}`)}
            activeOpacity={0.8}
          >
            <Ionicons name={ex.icon} size={30} color={COLORS.button} />
            <Text style={styles.cardLabel} numberOfLines={1}>{ex.label}</Text>
            <Text style={styles.cardGroup}>{ex.group}</Text>
            {ex.working === false ? (
              <Text style={styles.soon}>Coming soon</Text>
            ) : (
              <View style={styles.howRow}>
                <Ionicons name="play-circle-outline" size={13} color={COLORS.button} />
                <Text style={styles.howText}>How to do it</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
