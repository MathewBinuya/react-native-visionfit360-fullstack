import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import COLORS from "../constants/colors"
import styles from '../assets/styles/notifications.style'
import {
  requestPermission,
  scheduleDailyNotifications,
  cancelAllNotifications,
  sendTestNotification,
} from '../lib/notifications'

export default function NotificationsScreen() {
  const [enabled, setEnabled] = useState(false);

  // fixed default reminder times (8 AM and 8 PM) — set by the app, not the user
  const MORNING = { hour: 8, minute: 0 };
  const EVENING = { hour: 20, minute: 0 };

  // load saved setting
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("notifSettings");
      if (saved) {
        const s = JSON.parse(saved);
        setEnabled(s.enabled);
      }
    })();
  }, []);

  const persist = async (isEnabled) => {
    await AsyncStorage.setItem("notifSettings", JSON.stringify({
      enabled: isEnabled,
      morningHour: MORNING.hour, morningMinute: MORNING.minute,
      eveningHour: EVENING.hour, eveningMinute: EVENING.minute,
    }));
  };

  const toggleEnabled = async (value) => {
    if (value) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert("Permission needed", "Enable notifications in your phone settings to get reminders.");
        return;
      }
      setEnabled(true);
      await scheduleDailyNotifications(MORNING.hour, MORNING.minute, EVENING.hour, EVENING.minute);
      await persist(true);
    } else {
      setEnabled(false);
      await cancelAllNotifications();
      await persist(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 16 }}>
        {/* master toggle */}
        <View style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>Daily reminders</Text>
            <Text style={styles.rowSub}>Workout reminder & motivation</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleEnabled}
            trackColor={{ true: COLORS.button }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* test button */}
        <TouchableOpacity style={styles.testBtn} onPress={sendTestNotification}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.button} />
          <Text style={styles.testText}>Send test notification</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}