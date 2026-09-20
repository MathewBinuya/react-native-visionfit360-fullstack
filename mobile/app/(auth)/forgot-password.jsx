import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/authStyle/forgot-password.style'
import { API_URL } from '../../lib/api'


export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
 
  const requestCode = async () => {
    if (!email.trim()) return Alert.alert("Missing", "Please enter your email address");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Alert.alert("Invalid", "Please enter a valid email address");
 
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
     
      if (!res.ok) throw new Error(data.message || "Something went wrong");
        // replace the if (data.resetCode) block with this:
      Alert.alert(
        "Code Sent! 📧",
        "A reset code has been sent to your email. Check your inbox.",
        [{ text: "Got it", onPress: () => setStep(2) }]
      );
        
  
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };
 
  const resetPassword = async () => {
    if (!resetCode.trim()) return Alert.alert("Missing", "Please enter your reset code");
    if (!newPassword) return Alert.alert("Missing", "Please enter a new password");
    if (newPassword !== confirmPassword) return Alert.alert("Mismatch", "Passwords do not match");
    if (newPassword.length < 8) return Alert.alert("Too short", "Password must be at least 8 characters");
    if (!/[a-zA-Z]/.test(newPassword)) return Alert.alert("Weak password", "Password must include at least one letter");
    if (!/[0-9]/.test(newPassword)) return Alert.alert("Weak password", "Password must include at least one number");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), resetCode: resetCode.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      Alert.alert("Password Reset! ✓", "Your password has been updated. Please log in.", [{ text: "Log in", onPress: () => router.replace("/(auth)") }]);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>
 
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{step === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? "Enter your email and we'll send you a reset code." : 'Enter the code from your email and set a new password.'}
        </Text>
      </View>
 
      {step === 1 && (
        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor={COLORS.placeholderText} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={requestCode} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.btnText}>Send Reset Code</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep(2)} style={styles.linkWrap}>
            <Text style={styles.link}>Already have a code?</Text>
          </TouchableOpacity>
        </View>
      )}
 
      {step === 2 && (
        <View style={styles.form}>
          <Text style={styles.label}>Reset Code</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="keypad-outline" size={18} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="6-digit code from email" placeholderTextColor={COLORS.placeholderText} value={resetCode} onChangeText={setResetCode} keyboardType="number-pad" maxLength={6} />
          </View>
 
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="New password" placeholderTextColor={COLORS.placeholderText} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
 
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor={COLORS.placeholderText} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
          </View>
 
          <Text style={styles.hint}>8+ characters, at least one letter and one number.</Text>
 
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={resetPassword} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.btnText}>Reset Password</Text>}
          </TouchableOpacity>
 
          <TouchableOpacity onPress={() => setStep(1)} style={styles.linkWrap}>
            <Text style={styles.link}>← Back to enter email</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}