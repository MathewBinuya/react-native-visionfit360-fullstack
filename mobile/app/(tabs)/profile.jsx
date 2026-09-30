import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/tabStyle/account.style'
import api from '../../lib/axios'
import { useAuthStore } from '../../store/authStore'

const GENDER_OPTIONS = ["male", "female", "other"];

const MAX_HEIGHT_CM = 280;
const MIN_HEIGHT_CM = 50;
const MAX_WEIGHT_KG = 700;
const MIN_WEIGHT_KG = 20;

const sanitizeName = (text) => text.replace(/[^a-zA-Z\s]/g, '');
const sanitizeNumeric = (text) => text.replace(/[^0-9]/g, '');

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [form, setForm] = useState({ name: "", bio: "", gender: "", heightCm: "", weightKg: "" });
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/profile");
      setForm({
        name: res.data.name || "",
        bio: res.data.bio || "",
        gender: res.data.gender || "",
        heightCm: res.data.heightCm?.toString() || "",
        weightKg: res.data.weightKg?.toString() || "",
      });
      setPhoto(res.data.photo || "");
      await setUser({ ...user, ...res.data });
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const saveProfile = async () => {
    const trimmedName = form.name.trim();
    if (trimmedName && !/^[a-zA-Z\s]+$/.test(trimmedName)) {
      Alert.alert("Invalid name", "Name can only contain letters and spaces.");
      return;
    }

    if (form.heightCm) {
      const h = Number(form.heightCm);
      if (isNaN(h) || h < MIN_HEIGHT_CM || h > MAX_HEIGHT_CM) {
        Alert.alert("Invalid height", `Height must be between ${MIN_HEIGHT_CM} and ${MAX_HEIGHT_CM} cm.`);
        return;
      }
    }

    if (form.weightKg) {
      const w = Number(form.weightKg);
      if (isNaN(w) || w < MIN_WEIGHT_KG || w > MAX_WEIGHT_KG) {
        Alert.alert("Invalid weight", `Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.put("/profile", {
        name: trimmedName,
        bio: form.bio,
        gender: form.gender,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      });

      const fresh = await api.get("/profile");
      setForm({
        name: fresh.data.name || "",
        bio: fresh.data.bio || "",
        gender: fresh.data.gender || "",
        heightCm: fresh.data.heightCm?.toString() || "",
        weightKg: fresh.data.weightKg?.toString() || "",
      });
      setPhoto(fresh.data.photo || "");
      await setUser({ ...user, ...fresh.data });

      Alert.alert("Saved", "Profile updated");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to change your picture");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    const image = result.assets[0];
    const formData = new FormData();
    formData.append("photo", { uri: image.uri, type: "image/jpeg", name: "photo.jpg" });

    try {
      const res = await api.post("/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhoto(res.data.photo);
      await setUser({ ...user, photo: res.data.photo });
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Upload failed");
    }
  };

  // asks for confirmation before logging out
  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)");
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.button} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.button} colors={[COLORS.button]} />
      }
    >
      <View style={styles.avatarWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>
              {form.name ? form.name.charAt(0).toUpperCase() : (user?.username?.charAt(0).toUpperCase() || "?")}
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={pickAndUploadPhoto} style={styles.changePhotoBtn}>
          <Ionicons name="camera-outline" size={16} color={COLORS.button} />
          <Text style={styles.changePhotoText}>Change photo</Text>
        </TouchableOpacity>
        <Text style={styles.usernameText}>@{user?.name || user?.username }</Text>
      </View>

      <Text style={styles.label}>Name</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={COLORS.placeholderText}
          value={form.name}
          onChangeText={(t) => setForm({ ...form, name: sanitizeName(t) })}
        />
      </View>

      <Text style={styles.label}>Bio</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder="About you"
          placeholderTextColor={COLORS.placeholderText}
          value={form.bio}
          onChangeText={(t) => setForm({ ...form, bio: t })}
          multiline
        />
      </View>

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.genderPill, form.gender === option && styles.genderPillActive]}
            onPress={() => setForm({ ...form, gender: option })}
          >
            <Text style={[styles.genderText, form.gender === option && styles.genderTextActive]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Height (cm)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="175"
              placeholderTextColor={COLORS.placeholderText}
              value={form.heightCm}
              onChangeText={(t) => setForm({ ...form, heightCm: sanitizeNumeric(t) })}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Weight (kg)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="70"
              placeholderTextColor={COLORS.placeholderText}
              value={form.weightKg}
              onChangeText={(t) => setForm({ ...form, weightKg: sanitizeNumeric(t) })}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={saveProfile}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save changes"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#a32d2d" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}