import { View, 
         Text,
         StyleSheet,
         Image,
         TextInput,
         TouchableOpacity,
         KeyboardAvoidingView,
         Platform,
         Alert,
         ActivityIndicator
        } 
         from 'react-native'
import { useState } from 'react'
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from 'expo-router';
import COLORS from '../../constants/colors';
import styles from '../../assets/styles/authStyle/signup.style';

import {useAuthStore} from "../../store/authStore"

export default function Signup() {
const router = useRouter();
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);

const {user, isLoading, register, token} = useAuthStore();

// ---- password rule checks (live) ----
const hasMinLength = password.length >= 8;
const hasLetter = /[a-zA-Z]/.test(password);
const hasNumber = /[0-9]/.test(password);
const isValidPassword = hasMinLength && hasLetter && hasNumber;

// strength: weak / medium / strong
const getStrength = () => {
  if (!password) return { label: "", level: 0, color: COLORS.border };
  let score = 0;
  if (hasMinLength) score++;
  if (hasLetter) score++;
  if (hasNumber) score++;
  if (password.length >= 12 || /[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak", level: 1, color: "#E24B4A" };
  if (score === 3) return { label: "Medium", level: 2, color: "#E2A33B" };
  return { label: "Strong", level: 3, color: "#1D9E75" };
};
const strength = getStrength();

const handleSignUp = async () => {
  // client-side guard (backend still enforces it too)
  if (!isValidPassword) {
    Alert.alert("Weak Password", "Password must be at least 8 characters and include a letter and a number.");
    return;
  }
  const result = await register(username, email, password);
  if(!result.success) {
      Alert.alert("Error", result.error);
      return;
  } 
  router.replace("/(onBoarding)/profile");
};

  return (
     <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
     >
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign up</Text>
        <View style={styles.formContainer}>
                   {/* Username */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputContainer}>
              <Ionicons 
                name="person"
                size={20}
                color={COLORS.black}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={COLORS.black}
                onChangeText={setUsername} 
                value={username}
                autoCapitalize="none"
                maxLength={30}
              />
          </View>
        </View>
                  {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons 
              name="mail"
              size={20}
              color={COLORS.black}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              placeholderTextColor={COLORS.black}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
          </View>
        </View>
               {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed"
              size={20}
              color={COLORS.primary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.black}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              maxLength={64}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
               <Ionicons
                 name={showPassword ? "eye" : "eye-off"}
                 size={20}
                 color={COLORS.black}
               />
            </TouchableOpacity>
          </View>

          {/* Strength meter + checklist (only show when typing) */}
          {password.length > 0 && (
            <View style={pwStyles.feedbackWrap}>
              <View style={pwStyles.meterRow}>
                <View style={[pwStyles.meterSegment, { backgroundColor: strength.level >= 1 ? strength.color : COLORS.border }]} />
                <View style={[pwStyles.meterSegment, { backgroundColor: strength.level >= 2 ? strength.color : COLORS.border }]} />
                <View style={[pwStyles.meterSegment, { backgroundColor: strength.level >= 3 ? strength.color : COLORS.border }]} />
              </View>
              {!!strength.label && (
                <Text style={[pwStyles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              )}
              <View style={pwStyles.checkRow}>
                <Ionicons name={hasMinLength ? "checkmark-circle" : "ellipse-outline"} size={14} color={hasMinLength ? "#1D9E75" : COLORS.gray} />
                <Text style={pwStyles.checkText}>At least 8 characters</Text>
              </View>
              <View style={pwStyles.checkRow}>
                <Ionicons name={hasLetter ? "checkmark-circle" : "ellipse-outline"} size={14} color={hasLetter ? "#1D9E75" : COLORS.gray} />
                <Text style={pwStyles.checkText}>Contains a letter</Text>
              </View>
              <View style={pwStyles.checkRow}>
                <Ionicons name={hasNumber ? "checkmark-circle" : "ellipse-outline"} size={14} color={hasNumber ? "#1D9E75" : COLORS.gray} />
                <Text style={pwStyles.checkText}>Contains a number</Text>
              </View>
            </View>
          )}
        </View>
        </View>
         <TouchableOpacity
           style={[styles.button, (!isValidPassword && password.length > 0) && { opacity: 0.6 }]}
           onPress={handleSignUp}
           disabled={isLoading}
         >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
              ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
        </TouchableOpacity>
                  {/* Footer */}
        <View style={styles.footer}>
           <Text style={styles.footerText}>Already have an account?</Text>
           <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Login</Text>
           </TouchableOpacity>
        </View>
      </View>
    </View>
    </KeyboardAvoidingView>
  )
}

// local styles for the password feedback (kept separate so your main style file stays untouched)
const pwStyles = StyleSheet.create({
  feedbackWrap: { marginTop: 10 },
  meterRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  meterSegment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  strengthLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  checkText: { fontSize: 12, color: COLORS.gray },
});