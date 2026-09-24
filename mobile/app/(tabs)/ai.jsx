import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, BackHandler, Share } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/tabStyle/ai.style'
import api from '../../lib/axios'

// turns the structured {intro, title, exercises} recommendation into readable chat text
const formatRecommendationText = (rec) => {
  const exerciseLines = rec.exercises.map((ex) => {
    const uniform = ex.sets.length > 1 && ex.sets.every(
      (s) => s.reps === ex.sets[0].reps && s.weightKg === ex.sets[0].weightKg
    );
    const summary = uniform
      ? `${ex.sets.length} sets x ${ex.sets[0].reps} reps${ex.sets[0].weightKg ? ` @ ${ex.sets[0].weightKg}kg` : ""}`
      : ex.sets.map((s, i) => `Set ${i + 1}: ${s.reps} reps${s.weightKg ? ` @ ${s.weightKg}kg` : ""}`).join(", ");
    return `• ${ex.name} — ${summary}`;
  }).join("\n");

  return `${rec.intro}\n\n${rec.title}\n${exerciseLines}`;
};

export default function AICoach() {
  // messages: { role: "user" | "model", text: string, workoutData?: { title, exercises } }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef(null);

  //  THREE DOTS MENU STATE 
  const [menuMessage, setMenuMessage] = useState(null); // { index, message }
  const [addingToTracker, setAddingToTracker] = useState(false);

  useEffect(() => {
    getInitialRecommendation();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (menuMessage) { setMenuMessage(null); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [menuMessage]);

  const getInitialRecommendation = async () => {
    try {
      const res = await api.post("/ai/recommend");
      const rec = res.data.recommendation;
      setMessages([{
        role: "model",
        text: formatRecommendationText(rec),
        workoutData: { title: rec.title, exercises: rec.exercises },
      }]);
    } catch (error) {
      setMessages([{ role: "model", text: "Hi! I'm your AI coach. Ask me anything about your workouts." }]);
    } finally {
      setInitialLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", { messages: newMessages });
      const { reply, workout } = res.data;

      if (workout) {
        const displayText = formatRecommendationText({ intro: reply, title: workout.title, exercises: workout.exercises });
        setMessages([...newMessages, {
          role: "model",
          text: displayText,
          workoutData: { title: workout.title, exercises: workout.exercises },
        }]);
      } else {
        setMessages([...newMessages, { role: "model", text: reply }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: "model", text: "Sorry, I couldn't respond right now. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (menuMessage) {
      try {
        await Share.share({ message: menuMessage.message.text });
      } catch (error) {}
    }
    setMenuMessage(null);
  };

  const handleDeleteMessage = () => {
    const index = menuMessage?.index;
    setMenuMessage(null);
    if (index === undefined) return;
    Alert.alert(
      "Delete message",
      "Remove this message from the conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => setMessages((prev) => prev.filter((_, i) => i !== index)),
        },
      ]
    );
  };

  const handleSetToTracker = async () => {
    if (!menuMessage?.message?.workoutData) return;
    setAddingToTracker(true);
    try {
      const { title, exercises } = menuMessage.message.workoutData;
      await api.post("/workouts", {
        title: title || "AI Recommended Workout",
        date: new Date().toISOString(),
        exercises,
      });
      setMenuMessage(null);
      Alert.alert("Added!", "This workout was added to your tracker.");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to add to tracker");
    } finally {
      setAddingToTracker(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 30}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={20} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Smart Plan</Text>
          <Text style={styles.headerSub}>Your personal fitness guide</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 16 }}
      >
        {initialLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.button} />
            <Text style={styles.loadingText}>Building your recommendation...</Text>
          </View>
        ) : (
          messages.map((m, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <View
                style={[
                  styles.bubble,
                  m.role === "user" ? styles.userBubble : styles.coachBubble,
                ]}
              >
                <Text style={m.role === "user" ? styles.userText : styles.coachText}>
                  {m.text}
                </Text>
              </View>
              {m.role === "model" && (
                <TouchableOpacity
                  onPress={() => setMenuMessage({ index: i, message: m })}
                  hitSlop={10}
                  style={{ alignSelf: "flex-start", padding: 6, marginLeft: 4 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.placeholderText} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        {loading && (
          <View style={[styles.bubble, styles.coachBubble]}>
            <ActivityIndicator color={COLORS.button} size="small" />
          </View>
        )}
      </ScrollView>

      {!!menuMessage && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50, elevation: 50,
        }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
            activeOpacity={1}
            onPress={() => setMenuMessage(null)}
          >
            <View style={{
              position: 'absolute',
              bottom: 24,
              left: 24, right: 24,
              backgroundColor: COLORS.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
            }}>
              <TouchableOpacity
                onPress={handleShare}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
                }}
              >
                <Ionicons name="share-outline" size={20} color={COLORS.button} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.button }}>Share</Text>
              </TouchableOpacity>

              {menuMessage?.message?.workoutData && (
                <TouchableOpacity
                  onPress={handleSetToTracker}
                  disabled={addingToTracker}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
                    opacity: addingToTracker ? 0.6 : 1,
                  }}
                >
                  {addingToTracker ? (
                    <ActivityIndicator size="small" color={COLORS.button} />
                  ) : (
                    <Ionicons name="barbell-outline" size={20} color={COLORS.button} />
                  )}
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.button }}>
                    Set to workout tracker
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleDeleteMessage}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}
              >
                <Ionicons name="trash-outline" size={20} color="#E24B4A" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#E24B4A' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask your coach..."
          placeholderTextColor={COLORS.black}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}