import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from "@react-native-async-storage/async-storage"
import COLORS from "../constants/colors"

export default function GetStarted() {
  // mark that the user has seen this, then route
  const go = async (path) => {
    await AsyncStorage.setItem("hasSeenGetStarted", "true");
    router.replace(path);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start your{"\n"}journey</Text>

      <Image
        source={require('../assets/images/new-hero-image.png')}   // your image here
        style={styles.image}
        resizeMode="contain"
      />

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => go("/(auth)/signup")}>
          <Text style={styles.primaryText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => go("/(auth)")}>
          <Text style={styles.secondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "600",
    color: COLORS.black,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "GeneralSans-Variable",
  },
  image: {
    width: "100%",
    height: 240,
    marginBottom: 36,
  },
  buttons: { gap: 12 },
  primaryBtn: {
    backgroundColor: COLORS.button,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
  secondaryBtn: {
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryText: { color: COLORS.black, fontSize: 15, fontWeight: "600", fontFamily: "GeneralSans-Variable" },
});