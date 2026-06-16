import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import AsyncStorage from "@react-native-async-storage/async-storage"
import COLORS from "../constants/colors"
import { useAuthStore } from '../store/authStore'

export default function Index() {
  const { token, user, checkAuth } = useAuthStore();
  const [ready, setReady] = useState(false);

  // run session check + minimum 1.5s logo display, in parallel
  useEffect(() => {
    const init = async () => {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));
      await Promise.all([checkAuth(), minDelay]);
      setReady(true);
    };
    init();
  }, []);

  // once both the check AND the delay are done, route
  useEffect(() => {
    if (!ready) return;

    const decideRoute = async () => {
      // logged in?
      if (token) {
        if (user?.onBoardingComplete) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/(onBoarding)/profile");
        }
        return;
      }

      // not logged in — has the user seen Get Started before?
      const seen = await AsyncStorage.getItem("hasSeenGetStarted");
      if (seen) {
        router.replace("/(auth)");              // straight to login
      } else {
        router.replace("/getstarted");          // first time - welcome
      }
    };

    decideRoute();
  }, [ready, token, user]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/visionfit-logo.png')}   // your logo here
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>VisionFIT360</Text>
      <Text style={styles.tagline}>Your personal fitness coach</Text>
      <ActivityIndicator size="small" color={COLORS.black} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,   // brand logo
  },
  logo: { width: 120, height: 120, marginBottom: 16 },
  appName: { fontSize: 28, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" },
  tagline: { fontSize: 14, color: COLORS.black, opacity: 0.85, marginTop: 4, fontFamily: "GeneralSans-Variable" },
});

const _ = useAuthStore; // (ignore — keeps import used if you trim later)