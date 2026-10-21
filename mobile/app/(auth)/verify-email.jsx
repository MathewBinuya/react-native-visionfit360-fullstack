import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, BackHandler, ScrollView } from 'react-native'
import { showAlert } from '../../components/AppAlert'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import COLORS from '../../constants/colors';
import styles from '../../assets/styles/authStyle/verifyEmail.style';

import {useAuthStore} from "../../store/authStore"

export default function VerifyEmail() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 min, matches backend expiry
  const [resendIn, setResendIn] = useState(60);        // 60s, matches backend resend cooldown
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef([]);
  const { verifyEmail, resendVerificationCode } = useAuthStore();

  // block the Android hardware/gesture back button while this screen is focused
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true; // swallow the press, do nothing
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Resend becomes available after the 60s cooldown — independent of the 15-min
  // code expiry, so a user who never got the email isn't stuck waiting.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleChange = (text, index) => {
    const newCode = [...code];

    if (text.length > 1) {
      // handles pasting the full code at once
      const chars = text.slice(0, 6).split("");
      chars.forEach((c, i) => {
        if (index + i < 6) newCode[index + i] = c;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      showAlert("Incomplete code", "Please enter all 6 digits.");
      return;
    }

    setIsVerifying(true);
    const result = await verifyEmail(email, fullCode);
    setIsVerifying(false);

    if (!result.success) {
      showAlert("Verification failed", result.error);
      return;
    }

    router.replace("/(onBoarding)/profile");
  };

  const handleResend = async () => {
    setIsResending(true);
    const result = await resendVerificationCode(email);
    setIsResending(false);

    if (!result.success) {
      showAlert("Error", result.error);
      return;
    }

    setSecondsLeft(900);
    setResendIn(60);
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false, headerBackVisible: false, headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: COLORS.black, fontWeight: "600" }}>{email}</Text>
              </Text>
            </View>

            <View style={styles.otpRow}>
              {code.map((digit, index) => (
                <View key={index} style={styles.otpBox}>
                  <TextInput
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={6} // allows paste-into-one-box to work
                    textAlign="center"
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <View style={[styles.resendRow, { flexDirection: "column", alignItems: "center", gap: 8 }]}>
              <Text style={styles.timerText}>
                {secondsLeft > 0 ? `Code expires in ${formatTime(secondsLeft)}` : "Your code has expired."}
              </Text>
              {isResending ? (
                <ActivityIndicator color={COLORS.button} size="small" />
              ) : resendIn > 0 ? (
                <Text style={styles.timerText}>Resend code in {resendIn}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendLink}>{"Didn't get it? Resend code"}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => router.replace("/(auth)/signup")} hitSlop={8}>
                <Text style={styles.timerText}>Wrong email? Go back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}