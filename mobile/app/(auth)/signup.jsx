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
const handleSignUp = async () => {
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
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
               <Ionicons
                 name={showPassword ? "eye" : "eye-off"}
                 size={20}
                 color={COLORS.black}
               />
            </TouchableOpacity>
          </View>
        </View>
        </View>
         <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={isLoading}>
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

