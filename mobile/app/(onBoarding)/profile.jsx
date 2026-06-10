import { View, 
         Text, 
         StyleSheet, 
         Dimensions,
         TextInput,
         KeyboardAvoidingView,
         ActivityIndicator,
         TouchableOpacity,
         Platform,
         Alert,
        } from 'react-native'
import { useState } from 'react'
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/profile.style';
import { router } from "expo-router";
import api from '../../lib/axios';


const GENDER_OPTIONS = ["male", "female", "other"];

export default function Profile() {
  const [form, setForm] = useState({ name: "", bio: "", gender: "", heightCm: "", weightKg: "" });

  const handleContinue = async () => {
    if (!form.name) {
      Alert.alert("Hold on", "Please enter your name");
      return;
    }
    try {
      await api.put("/profile", {
        name: form.name,
        bio: form.bio,
        gender: form.gender,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      });
      router.push("/(onBoarding)/bmi");
    } catch (error) {
      console.log("STATUS:", error.response?.status);
      console.log("DATA:", error.response?.data);
      console.log("MESSAGE:", error.message);
      Alert.alert("Error", error.response?.data?.message || "Failed to save");
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
                    onChangeText={(t) => setForm({ ...form, heightCm: t })}
                    keyboardType="numeric"
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
                    onChangeText={(t) => setForm({ ...form, weightKg: t })}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}



