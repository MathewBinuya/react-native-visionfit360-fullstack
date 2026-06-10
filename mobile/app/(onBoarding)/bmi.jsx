import { View, 
         Text, 
         StyleSheet,
         TouchableOpacity,
         ActivityIndicator,
         Alert,
        } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/bmi.style'
import api from '../../lib/axios'
import { useAuthStore } from '../../store/authStore'


export default function BMI() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculate();
  }, []);

  const calculate = async () => {
    try {
      // height & weight were saved in the profile step,
      // so the backend pulls them from the user's profile
      const res = await api.post("/bmi", {});
      setResult(res.data);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not calculate BMI");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      await api.put("/profile/complete-onboarding");        // flip the flag on backend
      await useAuthStore.getState().completeOnboarding();   // sync store + storage
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Something went wrong");
    }
  };

  const colorFor = (cat) => {
    if (cat === "Normal") return "#0f6e56";
    if (cat === "Underweight" || cat === "Overweight") return "#854f0b";
    return "#a32d2d";
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.step}>2 of 2</Text>
        <Text style={styles.title}>Your body composition</Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.button} style={{ marginVertical: 40 }} />
        ) : result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Your BMI</Text>
            <Text style={[styles.resultValue, { color: colorFor(result.category) }]}>
              {result.bmi}
            </Text>
            <Text style={[styles.category, { color: colorFor(result.category) }]}>
              {result.category}
            </Text>

            <View style={styles.recap}>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Height</Text>
                <Text style={styles.recapValue}>{result.heightCm} cm</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Weight</Text>
                <Text style={styles.recapValue}>{result.weightKg} kg</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.empty}>Add your height and weight to see your BMI.</Text>
        )}

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue to dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
