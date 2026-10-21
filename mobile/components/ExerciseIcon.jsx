import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { EXERCISE_ICONS } from "../lib/exerciseIcons";

// Per-exercise RepVision icon for the given AR_EXERCISES `key`. Renders the
// bundled monochrome PNG tinted with `color`; falls back to the exercise's
// Ionicon when no image exists so nothing ever renders blank.
export default function ExerciseIcon({ exerciseKey, size = 30, color, fallback, style }) {
  const source = exerciseKey && EXERCISE_ICONS[exerciseKey];
  if (source) {
    return (
      <Image
        source={source}
        tintColor={color}
        style={[{ width: size, height: size }, style]}
        contentFit="contain"
      />
    );
  }
  return <Ionicons name={fallback || "body-outline"} size={size} color={color} />;
}
