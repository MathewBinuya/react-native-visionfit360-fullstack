import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import COLORS from "../constants/colors"
import api from '../lib/axios'
import { showAlert } from '../components/AppAlert'

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

export default function Feedback() {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      showAlert("Pick a rating", "Please tap a star from 1 to 5 before sending.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/feedback", { rating, comment: comment.trim() });
      showAlert("Thank you!", "Your feedback has been sent.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      showAlert("Error", error.response?.data?.message || "Failed to send feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.black, fontFamily: "GeneralSans-Variable" }}>
          Send Feedback
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 15, color: COLORS.black, marginBottom: 6, fontFamily: "GeneralSans-Variable" }}>
          How would you rate VisionFIT360?
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: 18, fontFamily: "GeneralSans-Variable" }}>
          Your feedback helps us improve the app.
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={40}
                color={star <= rating ? "#F5A623" : COLORS.border}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text
          style={{
            textAlign: "center",
            height: 20,
            color: COLORS.gray,
            marginBottom: 24,
            fontFamily: "GeneralSans-Variable",
          }}
        >
          {rating ? RATING_LABELS[rating] : ""}
        </Text>

        <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: 6, fontFamily: "GeneralSans-Variable" }}>
          Comment (optional)
        </Text>
        <View
          style={{
            backgroundColor: COLORS.inputBackground,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 10,
            padding: 12,
            marginBottom: 24,
          }}
        >
          <TextInput
            style={{ minHeight: 100, color: COLORS.black, textAlignVertical: "top", fontFamily: "GeneralSans-Variable" }}
            placeholder="Tell us what you think..."
            placeholderTextColor={COLORS.placeholderText}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: COLORS.button,
            borderRadius: 10,
            padding: 15,
            alignItems: "center",
            opacity: saving ? 0.6 : 1,
          }}
          onPress={submit}
          disabled={saving}
        >
          <Text style={{ color: COLORS.white, fontWeight: "600", fontSize: 15, fontFamily: "GeneralSans-Variable" }}>
            {saving ? "Sending..." : "Send Feedback"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}