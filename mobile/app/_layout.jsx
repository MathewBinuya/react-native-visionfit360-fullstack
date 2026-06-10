import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen"
import { StatusBar } from "expo-status-bar";
import {useFonts} from "expo-font";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "GeneralSans-Variable": require("../assets/fonts/GeneralSans-Variable.ttf"),
  });

  if(!fontsLoaded) return null;

  return (
    <SafeAreaProvider>  
      <SafeScreen>
        <Stack screenOptions={{headerShown: false}} >
          <Stack.Screen name="index"/>
          <Stack.Screen name="(auth)"/>
          <Stack.Screen name="(onBoarding)"/>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout" />
          <Stack.Screen name="getstarted" />
          {/* <Stack.Screen name="notifications" /> */}

          
        </Stack>
      </SafeScreen>
      <StatusBar style="dark"/>
    </SafeAreaProvider>
  );
}
 