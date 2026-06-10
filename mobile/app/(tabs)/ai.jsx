import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/ai.style'
import api from '../../lib/axios'

export default function AICoach() {
  // messages: { role: "user" | "model", text: string }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef(null);

  // on open, fetch the auto recommendation as the first coach message
  useEffect(() => {
    getInitialRecommendation();
  }, []);

  const getInitialRecommendation = async () => {
    try {
      const res = await api.post("/ai/recommend");
      setMessages([{ role: "model", text: res.data.recommendation }]);
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
      setMessages([...newMessages, { role: "model", text: res.data.reply }]);
    } catch (error) {
      setMessages([...newMessages, { role: "model", text: "Sorry, I couldn't respond right now. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 30}
    >
      {/* header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={20} color={COLORS.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <Text style={styles.headerSub}>Your personal fitness guide</Text>
        </View>
      </View>

      {/* messages */}
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
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === "user" ? styles.userBubble : styles.coachBubble,
              ]}
            >
              <Text style={m.role === "user" ? styles.userText : styles.coachText}>
                {m.text}
              </Text>
            </View>
          ))
        )}

        {loading && (
          <View style={[styles.bubble, styles.coachBubble]}>
            <ActivityIndicator color={COLORS.button} size="small" />
          </View>
        )}
      </ScrollView>

      {/* input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask your coach..."
          placeholderTextColor={COLORS.placeholderText}
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