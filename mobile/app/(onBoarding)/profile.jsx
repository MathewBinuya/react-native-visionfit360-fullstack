import { View, 
         Text, 
         TextInput,
         KeyboardAvoidingView,
         ActivityIndicator,
         TouchableOpacity,
         Platform,
         Alert,
        } from 'react-native'
import { useState } from 'react'
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/onBoardingStyle/profile.style';
import { router } from "expo-router";
import api from '../../lib/axios';


const GENDER_OPTIONS = ["male", "female", "other"];

// realistic limits so people can't enter nonsense like 0 or 99999
const HEIGHT_MIN = 50, HEIGHT_MAX = 250;
const WEIGHT_MIN = 20, WEIGHT_MAX = 300;

export default function Profile() {
  const [form, setForm] = useState({ name: "", bio: "", gender: "", heightCm: "", weightKg: "" });
  const [isSaving, setIsSaving] = useState(false);

  const height = Number(form.heightCm);
  const weight = Number(form.weightKg);

  // every field must be filled in (whitespace-only doesn't count)
  const isComplete =
    form.name.trim() !== "" &&
    form.bio.trim() !== "" &&
    form.gender !== "" &&
    form.heightCm !== "" &&
    form.weightKg !== "";

  // returns an error message, or null if everything is valid
  const validate = () => {
    if (!form.name.trim()) return "Please enter your name";
    if (!form.bio.trim()) return "Please tell us a little about yourself";
    if (!form.gender) return "Please select your gender";
    if (!form.heightCm) return "Please enter your height";
    if (isNaN(height) || height < HEIGHT_MIN || height > HEIGHT_MAX)
      return `Height must be between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm`;
    if (!form.weightKg) return "Please enter your weight";
    if (isNaN(weight) || weight < WEIGHT_MIN || weight > WEIGHT_MAX)
      return `Weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg`;
    return null;
  };

  // allow only digits (and one decimal point for weight)
  const onlyNumber = (text, allowDecimal = false) => {
    const pattern = allowDecimal ? /[^0-9.]/g : /[^0-9]/g;
    let cleaned = text.replace(pattern, "");
    if (allowDecimal) {
      const [whole, ...rest] = cleaned.split(".");
      cleaned = rest.length ? `${whole}.${rest.join("")}` : whole;
    }
    return cleaned;
  };

  const handleContinue = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Hold on", error);
      return;
    }

    setIsSaving(true);
    try {
      await api.put("/profile", {
        name: form.name.trim(),
        bio: form.bio.trim(),
        gender: form.gender,
        heightCm: height,
        weightKg: weight,
      });
      router.push("/(onBoarding)/bmi");
    } catch (error) {
      console.log("STATUS:", error.response?.status);
      console.log("DATA:", error.response?.data);
      console.log("MESSAGE:", error.message);
      Alert.alert("Error", error.response?.data?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          {/* title */}
          <Text style={styles.label}>1 of 2</Text>
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

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.genderPill,
                      form.gender === option && styles.genderPillActive,
                    ]}
                    onPress={() => setForm({ ...form, gender: option })}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        form.gender === option && styles.genderTextActive,
                      ]}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Height & Weight */}
            <View style={styles.rowContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Height (Cm)</Text>
                <View style={styles.inputRowContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="175"
                    placeholderTextColor={COLORS.placeholderText}
                    value={form.heightCm}
                    onChangeText={(t) => setForm({ ...form, heightCm: onlyNumber(t) })}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Weight (Kg)</Text>
                <View style={styles.inputRowContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="70"
                    placeholderTextColor={COLORS.placeholderText}
                    value={form.weightKg}
                    onChangeText={(t) => setForm({ ...form, weightKg: onlyNumber(t, true) })}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
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
      </View>
    </KeyboardAvoidingView>
  );
}