import { View, 
         Text, 
         StyleSheet,
         Image,
         Dimensions,
         TextInput,
         KeyboardAvoidingView,
         ActivityIndicator,
         TouchableOpacity,
         Platform,
         Alert
        } 
        from 'react-native'
import { Link } from 'expo-router'        
import { router } from "expo-router";
import React, { useState } from 'react'
import { Ionicons } from "@expo/vector-icons"
import styles from '../../assets/styles/authStyle/login.style'
import COLORS from '../../constants/colors'

import {useAuthStore} from "../../store/authStore"

export default function Login() {

            // login setup
const [email,setEmail] = useState("");
const [password,setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);

const {isLoading, login, isCheckingAuth} = useAuthStore();

const handleLogin = async () => {
  const result = await login(email,password);
  if(!result.success) {
    Alert.alert("Error", result.error);
    return;
  }
  
  const user = useAuthStore.getState().user;
  if (user?.onBoardingComplete) {
    router.replace("/(tabs)/home");          
  } else {
    router.replace("/(onBoarding)/profile"); 
  }

};

 if(isCheckingAuth) return null;
   
  return (
     <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >  
    <View style={styles.container}>
            {/* Login Image */}
       <View style={styles.topIllustration}>
          <Image
          source={require('../../assets/images/login-image.png')}
          style={styles.illustrationImage}
          resizeMode='contain'
       />
       </View>
               {/* Login Page */}
       <View style={styles.card}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Welcome back to VisionFIT</Text>
       <View style={styles.formContainer}>
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
                placeholder="Enter your email"
                placeholderTextColor={COLORS.black}
                value={email}
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
                    color={COLORS.black}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.black}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                   <TouchableOpacity
                     onPress={() =>  setShowPassword(!showPassword)}
                     style={styles.eyeIcon} 
                   >
                    <Ionicons 
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color={COLORS.black}
                    />
                   </TouchableOpacity>
                 </View>
              </View>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}> 
                  {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Login</Text>
                    )}
            </TouchableOpacity>
                {/* Footer */}
            <View style={styles.footer}> 
              <Text style={styles.footerText}>Don't have an account?</Text>
              <Link href="/signup" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Sign up</Text>
                  </TouchableOpacity>
              </Link>
            </View>
       </View>
    </View>
    </KeyboardAvoidingView>
  );
}


