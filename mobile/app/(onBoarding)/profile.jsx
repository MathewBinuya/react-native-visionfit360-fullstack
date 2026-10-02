import { View,
         Text,
         TextInput,
         KeyboardAvoidingView,
         ActivityIndicator,
         TouchableOpacity,
         ScrollView,
         Platform,
        } from 'react-native'
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/onBoardingStyle/profile.style';
import { router } from "expo-router";
import api from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { useAlert } from '../../components/AppAlert';
import {
  cmToFtIn, ftInToCm, kgToLb, lbToKg, cleanNumber, unitPrefKey,
  MIN_HEIGHT_CM, MAX_HEIGHT_CM, MIN_WEIGHT_KG, MAX_WEIGHT_KG,
} from '../../lib/units';


const GENDER_OPTIONS = ["male", "female", "other"];

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const alert = useAlert();

  const [form, setForm] = useState({ name: "", bio: "", gender: "" });
  const [isSaving, setIsSaving] = useState(false);

  // canonical metric values (what we send) — strings so inputs stay controlled
  const [metricHeight, setMetricHeight] = useState("");
  const [metricWeight, setMetricWeight] = useState("");

  // display units + the per-unit input fields
  const [heightUnit, setHeightUnit] = useState("cm"); // 'cm' | 'ft'
  const [weightUnit, setWeightUnit] = useState("kg"); // 'kg' | 'lb'
  const [ftVal, setFtVal] = useState("");
  const [inVal, setInVal] = useState("");
  const [lbVal, setLbVal] = useState("");

  // restore the user's saved unit preference
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(unitPrefKey(user?.id));
        if (raw) {
          const p = JSON.parse(raw);
          if (p.height === "ft" || p.height === "cm") setHeightUnit(p.height);
          if (p.weight === "lb" || p.weight === "kg") setWeightUnit(p.weight);
        }
      } catch (_e) {}
    })();
  }, [user?.id]);

  const savePref = async (height, weight) => {
    try {
      await AsyncStorage.setItem(unitPrefKey(user?.id), JSON.stringify({ height, weight }));
    } catch (_e) {}
  };

  // gender is REQUIRED now — name/bio/gender/height/weight are all needed to continue
  const isComplete =
    form.name.trim() !== "" &&
    form.bio.trim() !== "" &&
    GENDER_OPTIONS.includes(form.gender) &&
    metricHeight !== "" &&
    metricWeight !== "";

  const validate = () => {
    if (!form.name.trim()) return "Please enter your name";
    if (!form.bio.trim()) return "Please tell us a little about yourself";
    if (!GENDER_OPTIONS.includes(form.gender)) return "Please select your gender";
    if (!metricHeight) return "Please enter your height";
    const h = Number(metricHeight);
    if (isNaN(h) || h < MIN_HEIGHT_CM || h > MAX_HEIGHT_CM)
      return `Please enter a valid height (${MIN_HEIGHT_CM}–${MAX_HEIGHT_CM} cm)`;
    if (!metricWeight) return "Please enter your weight";
    const w = Number(metricWeight);
    if (isNaN(w) || w < MIN_WEIGHT_KG || w > MAX_WEIGHT_KG)
      return `Please enter a valid weight (${MIN_WEIGHT_KG}–${MAX_WEIGHT_KG} kg)`;
    return null;
  };

  // --- height handlers ---
  const onHeightCm = (t) => setMetricHeight(cleanNumber(t));
  const onFt = (t) => {
    const v = cleanNumber(t);
    setFtVal(v);
    setMetricHeight(ftInToCm(v, inVal));
  };
  const onIn = (t) => {
    const v = cleanNumber(t);
    setInVal(v);
    setMetricHeight(ftInToCm(ftVal, v));
  };
  const toggleHeightUnit = (u) => {
    if (u === heightUnit) return;
    if (u === "ft") {
      const { ft, in: inch } = cmToFtIn(metricHeight);
      setFtVal(ft); setInVal(inch);
    }
    // switching to cm keeps metricHeight as-is (canonical)
    setHeightUnit(u);
    savePref(u, weightUnit);
  };

  // --- weight handlers ---
  const onWeightKg = (t) => setMetricWeight(cleanNumber(t, true));
  const onLb = (t) => {
    const v = cleanNumber(t, true);
    setLbVal(v);
    setMetricWeight(lbToKg(v));
  };
  const toggleWeightUnit = (u) => {
    if (u === weightUnit) return;
    if (u === "lb") setLbVal(kgToLb(metricWeight));
    setWeightUnit(u);
    savePref(heightUnit, u);
  };

  const handleContinue = async () => {
    const error = validate();
    if (error) {
      alert("Hold on", error);
      return;
    }

    setIsSaving(true);
    try {
      await api.put("/profile", {
        name: form.name.trim(),
        bio: form.bio.trim(),
        gender: form.gender, // required
        heightCm: Number(metricHeight),
        weightKg: Number(metricWeight),
      });
      router.push("/(onBoarding)/goal");
    } catch (error) {
      alert("Error", error.response?.data?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const UnitToggle = ({ units, active, onPick }) => (
    <View style={styles.unitToggle}>
      {units.map((u) => (
        <TouchableOpacity
          key={u}
          style={[styles.unitPill, active === u && styles.unitPillActive]}
          onPress={() => onPick(u)}
        >
          <Text style={[styles.unitText, active === u && styles.unitTextActive]}>
            {u === "ft" ? "ft/in" : u}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>1 of 3</Text>
          <Text style={styles.title}>Tell us about yourself</Text>

          <View style={styles.formContainer}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor={COLORS.placeholderText}
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  maxLength={50}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="About you"
                  placeholderTextColor={COLORS.placeholderText}
                  value={form.bio}
                  onChangeText={(t) => setForm({ ...form, bio: t })}
                  maxLength={150}
                />
              </View>
            </View>

            {/* Gender (required) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.genderPill, form.gender === option && styles.genderPillActive]}
                    onPress={() => setForm({ ...form, gender: option })}
                  >
                    <Text style={[styles.genderText, form.gender === option && styles.genderTextActive]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Height */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Height</Text>
                <UnitToggle units={["cm", "ft"]} active={heightUnit} onPick={toggleHeightUnit} />
              </View>
              {heightUnit === "cm" ? (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="175"
                    placeholderTextColor={COLORS.placeholderText}
                    value={metricHeight}
                    onChangeText={onHeightCm}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              ) : (
                <View style={styles.rowContainer}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="5"
                      placeholderTextColor={COLORS.placeholderText}
                      value={ftVal}
                      onChangeText={onFt}
                      keyboardType="numeric"
                      maxLength={1}
                    />
                    <Text style={styles.unitSuffix}>ft</Text>
                  </View>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="9"
                      placeholderTextColor={COLORS.placeholderText}
                      value={inVal}
                      onChangeText={onIn}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.unitSuffix}>in</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Weight */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Weight</Text>
                <UnitToggle units={["kg", "lb"]} active={weightUnit} onPick={toggleWeightUnit} />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={weightUnit === "kg" ? "70" : "154"}
                  placeholderTextColor={COLORS.placeholderText}
                  value={weightUnit === "kg" ? metricWeight : lbVal}
                  onChangeText={weightUnit === "kg" ? onWeightKg : onLb}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <Text style={styles.unitSuffix}>{weightUnit}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, (!isComplete || isSaving) && { opacity: 0.6 }]}
            onPress={handleContinue}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}