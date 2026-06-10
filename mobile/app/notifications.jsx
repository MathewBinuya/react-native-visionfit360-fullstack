import { View, Text, TouchableOpacity, Switch, Platform, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
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
  const [morning, setMorning] = useState(new Date(2024, 0, 1, 8, 0));   // 8:00 AM
  const [evening, setEvening] = useState(new Date(2024, 0, 1, 20, 0));  // 8:00 PM
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);

  // load saved settings
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("notifSettings");
      if (saved) {
        const s = JSON.parse(saved);
        setEnabled(s.enabled);
        setMorning(new Date(2024, 0, 1, s.morningHour, s.morningMinute));
        setEvening(new Date(2024, 0, 1, s.eveningHour, s.eveningMinute));
      }
    })();
  }, []);

  const persist = async (isEnabled, m, e) => {
    await AsyncStorage.setItem("notifSettings", JSON.stringify({
      enabled: isEnabled,
      morningHour: m.getHours(),
      morningMinute: m.getMinutes(),
      eveningHour: e.getHours(),
      eveningMinute: e.getMinutes(),
    }));
  };

  const applySchedule = async (m, e) => {
    await scheduleDailyNotifications(m.getHours(), m.getMinutes(), e.getHours(), e.getMinutes());
  };

  const toggleEnabled = async (value) => {
    if (value) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert("Permission needed", "Enable notifications in your phone settings to get reminders.");
        return;
      }
      setEnabled(true);
      await applySchedule(morning, evening);
      await persist(true, morning, evening);
    } else {
      setEnabled(false);
      await cancelAllNotifications();
      await persist(false, morning, evening);
    }
  };

  const onMorningChange = async (event, selected) => {
    setShowMorningPicker(Platform.OS === "ios");
    if (selected) {
      setMorning(selected);
      if (enabled) await applySchedule(selected, evening);
      await persist(enabled, selected, evening);
    }
  };

  const onEveningChange = async (event, selected) => {
    setShowEveningPicker(Platform.OS === "ios");
    if (selected) {
      setEvening(selected);
      if (enabled) await applySchedule(morning, selected);
      await persist(enabled, morning, selected);
    }
  };

  const fmt = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

        {/* morning time */}
        <TouchableOpacity
          style={[styles.timeRow, !enabled && { opacity: 0.4 }]}
          disabled={!enabled}
          onPress={() => setShowMorningPicker(true)}
        >
          <View style={styles.timeLeft}>
            <Ionicons name="sunny-outline" size={20} color={COLORS.button} />
            <Text style={styles.timeLabel}>Morning reminder</Text>
          </View>
          <Text style={styles.timeValue}>{fmt(morning)}</Text>
        </TouchableOpacity>

        {/* evening time */}
        <TouchableOpacity
          style={[styles.timeRow, !enabled && { opacity: 0.4 }]}
          disabled={!enabled}
          onPress={() => setShowEveningPicker(true)}
        >
          <View style={styles.timeLeft}>
            <Ionicons name="moon-outline" size={20} color={COLORS.button} />
            <Text style={styles.timeLabel}>Evening motivation</Text>
          </View>
          <Text style={styles.timeValue}>{fmt(evening)}</Text>
        </TouchableOpacity>

        {/* test button */}
        <TouchableOpacity style={styles.testBtn} onPress={sendTestNotification}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.button} />
          <Text style={styles.testText}>Send test notification</Text>
        </TouchableOpacity>

        {(showMorningPicker) && (
          <DateTimePicker value={morning} mode="time" is24Hour={false} onChange={onMorningChange} />
        )}
        {(showEveningPicker) && (
          <DateTimePicker value={evening} mode="time" is24Hour={false} onChange={onEveningChange} />
        )}
      </View>
    </View>
  );
}