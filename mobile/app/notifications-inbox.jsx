import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { showAlert } from '../components/AppAlert'
import { useState, useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { goBack } from '../lib/nav'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import { getInbox, reconcileInbox, markAllRead, clearInbox } from '../lib/notifInbox'

// "2m ago" / "3h ago" for recent items; otherwise a full date.
const relative = (ms) => {
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
// Exact date + time, shown under every item so nothing is ambiguous.
const stamp = (ms) => {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export default function NotificationsInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Every time the feed opens: pull any fired reminders into it, show them, mark read.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await reconcileInbox();
          setItems(await getInbox());
          await markAllRead();
        } catch (_e) {}
        setLoading(false);
      })();
    }, [])
  );

  const confirmClear = () => {
    if (!items.length) return;
    showAlert(
      "Clear notifications",
      "Remove all notifications from this list?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: async () => { await clearInbox(); setItems([]); } },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
      }}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" }}>
          Notifications
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity onPress={confirmClear} hitSlop={8} disabled={!items.length}>
            <Ionicons name="trash-outline" size={20} color={items.length ? COLORS.black : COLORS.border} />
          </TouchableOpacity>
          {/* reminder settings live on the old screen */}
          <TouchableOpacity onPress={() => router.push("/notifications")} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
        {items.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 80 }}>
            <Ionicons name="notifications-off-outline" size={44} color={COLORS.placeholderText} />
            <Text style={{ color: COLORS.placeholderText, marginTop: 12, fontFamily: "GeneralSans-Variable" }}>
              {loading ? "Loading…" : "No notifications yet"}
            </Text>
            {!loading && (
              <Text style={{ color: COLORS.placeholderText, fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 24 }}>
                Your workout reminders and progress nudges will show up here.
              </Text>
            )}
          </View>
        ) : (
          items.map((n) => (
            <View
              key={n.id}
              style={{
                flexDirection: "row", gap: 12,
                backgroundColor: COLORS.cards, borderRadius: 14,
                borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10,
              }}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.inputBackground,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="notifications" size={18} color={COLORS.button} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.black, fontFamily: "GeneralSans-Variable" }} numberOfLines={1}>
                    {n.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.placeholderText, marginLeft: 8, fontFamily: "GeneralSans-Variable" }}>
                    {relative(n.at)}
                  </Text>
                </View>
                {!!n.body && (
                  <Text style={{ fontSize: 13, lineHeight: 18, color: "#555555", marginTop: 3, fontFamily: "GeneralSans-Variable" }}>
                    {n.body}
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: COLORS.placeholderText, marginTop: 6, fontFamily: "GeneralSans-Variable" }}>
                  {stamp(n.at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
