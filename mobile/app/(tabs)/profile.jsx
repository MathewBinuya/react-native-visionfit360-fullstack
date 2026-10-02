import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import AsyncStorage from '@react-native-async-storage/async-storage'
import COLORS from "../../constants/colors"
import styles from '../../assets/styles/tabStyle/account.style'
import api from '../../lib/axios'
import { useAuthStore } from '../../store/authStore'
import { useAlert } from '../../components/AppAlert'
import {
  cmToFtIn, ftInToCm, kgToLb, lbToKg, cleanNumber, unitPrefKey,
  MIN_HEIGHT_CM, MAX_HEIGHT_CM, MIN_WEIGHT_KG, MAX_WEIGHT_KG,
} from '../../lib/units'

const sanitizeName = (text) => text.replace(/[^a-zA-Z\s]/g, '');

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const alert = useAlert();

  const [form, setForm] = useState({ name: "", bio: "" });
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // canonical metric values (what we send)
  const [metricHeight, setMetricHeight] = useState("");
  const [metricWeight, setMetricWeight] = useState("");

  // display units + per-unit input fields
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [ftVal, setFtVal] = useState("");
  const [inVal, setInVal] = useState("");
  const [lbVal, setLbVal] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    let hUnit = "cm", wUnit = "kg";
    try {
      const raw = await AsyncStorage.getItem(unitPrefKey(user?.id));
      if (raw) {
        const p = JSON.parse(raw);
        if (p.height === "ft" || p.height === "cm") hUnit = p.height;
        if (p.weight === "lb" || p.weight === "kg") wUnit = p.weight;
      }
    } catch (_e) {}
    setHeightUnit(hUnit);
    setWeightUnit(wUnit);
    await loadProfile(hUnit, wUnit);
  };

  const loadProfile = async (hUnit = heightUnit, wUnit = weightUnit) => {
    try {
      const res = await api.get("/profile");
      const h = res.data.heightCm?.toString() || "";
      const w = res.data.weightKg?.toString() || "";
      setForm({ name: res.data.name || "", bio: res.data.bio || "" });
      setMetricHeight(h);
      setMetricWeight(w);
      if (hUnit === "ft") { const { ft, in: inch } = cmToFtIn(h); setFtVal(ft); setInVal(inch); }
      if (wUnit === "lb") setLbVal(kgToLb(w));
      setPhoto(res.data.photo || "");
      await setUser({ ...user, ...res.data });
    } catch (error) {
      alert("Error", error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const savePref = async (height, weight) => {
    try {
      await AsyncStorage.setItem(unitPrefKey(user?.id), JSON.stringify({ height, weight }));
    } catch (_e) {}
  };

  // --- unit handlers ---
  const onHeightCm = (t) => setMetricHeight(cleanNumber(t));
  const onFt = (t) => { const v = cleanNumber(t); setFtVal(v); setMetricHeight(ftInToCm(v, inVal)); };
  const onIn = (t) => { const v = cleanNumber(t); setInVal(v); setMetricHeight(ftInToCm(ftVal, v)); };
  const toggleHeightUnit = (u) => {
    if (u === heightUnit) return;
    if (u === "ft") { const { ft, in: inch } = cmToFtIn(metricHeight); setFtVal(ft); setInVal(inch); }
    setHeightUnit(u);
    savePref(u, weightUnit);
  };
  const onWeightKg = (t) => setMetricWeight(cleanNumber(t, true));
  const onLb = (t) => { const v = cleanNumber(t, true); setLbVal(v); setMetricWeight(lbToKg(v)); };
  const toggleWeightUnit = (u) => {
    if (u === weightUnit) return;
    if (u === "lb") setLbVal(kgToLb(metricWeight));
    setWeightUnit(u);
    savePref(heightUnit, u);
  };

  const saveProfile = async () => {
    const trimmedName = form.name.trim();
    if (trimmedName && !/^[a-zA-Z\s]+$/.test(trimmedName)) {
      alert("Invalid name", "Name can only contain letters and spaces.");
      return;
    }
    if (metricHeight) {
      const h = Number(metricHeight);
      if (isNaN(h) || h < MIN_HEIGHT_CM || h > MAX_HEIGHT_CM) {
        alert("Invalid height", `Please enter a valid height (${MIN_HEIGHT_CM}–${MAX_HEIGHT_CM} cm).`);
        return;
      }
    }
    if (metricWeight) {
      const w = Number(metricWeight);
      if (isNaN(w) || w < MIN_WEIGHT_KG || w > MAX_WEIGHT_KG) {
        alert("Invalid weight", `Please enter a valid weight (${MIN_WEIGHT_KG}–${MAX_WEIGHT_KG} kg).`);
        return;
      }
    }

    setSaving(true);
    try {
      // gender intentionally omitted — the DB field stays untouched for existing users
      await api.put("/profile", {
        name: trimmedName,
        bio: form.bio,
        heightCm: metricHeight ? Number(metricHeight) : undefined,
        weightKg: metricWeight ? Number(metricWeight) : undefined,
      });

      await loadProfile();
      alert("Saved", "Profile updated");
    } catch (error) {
      alert("Error", error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert("Permission needed", "Allow photo access to change your picture");
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
      alert("Error", error.response?.data?.message || "Upload failed");
    }
  };

  // asks for confirmation before logging out
  const handleLogout = () => {
    alert(
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

  const UnitToggle = ({ units, active, onPick }) => (
    <View style={styles.unitToggle}>
      {units.map((u) => (
        <TouchableOpacity
          key={u}
          style={[styles.unitPill, active === u && styles.unitPillActive]}
          onPress={() => onPick(u)}
        >
          <Text style={[styles.unitText, active === u && styles.unitTextActive]}>
            {u === "ft" ? "ft/in" : u}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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
      {/* Photo */}
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
        <Text style={styles.usernameText}>@{user?.name || user?.username}</Text>
      </View>

      {/* Name */}
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

      {/* Bio */}
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

      {/* Height */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Height</Text>
        <UnitToggle units={["cm", "ft"]} active={heightUnit} onPick={toggleHeightUnit} />
      </View>
      {heightUnit === "cm" ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="175"
            placeholderTextColor={COLORS.placeholderText}
            value={metricHeight}
            onChangeText={onHeightCm}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.unitSuffix}>cm</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={[styles.inputRow, { flex: 1 }]}>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={COLORS.placeholderText}
              value={ftVal}
              onChangeText={onFt}
              keyboardType="numeric"
              maxLength={1}
            />
            <Text style={styles.unitSuffix}>ft</Text>
          </View>
          <View style={[styles.inputRow, { flex: 1 }]}>
            <TextInput
              style={styles.input}
              placeholder="9"
              placeholderTextColor={COLORS.placeholderText}
              value={inVal}
              onChangeText={onIn}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={styles.unitSuffix}>in</Text>
          </View>
        </View>
      )}

      {/* Weight */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Weight</Text>
        <UnitToggle units={["kg", "lb"]} active={weightUnit} onPick={toggleWeightUnit} />
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={weightUnit === "kg" ? "70" : "154"}
          placeholderTextColor={COLORS.placeholderText}
          value={weightUnit === "kg" ? metricWeight : lbVal}
          onChangeText={weightUnit === "kg" ? onWeightKg : onLb}
          keyboardType="numeric"
          maxLength={6}
        />
        <Text style={styles.unitSuffix}>{weightUnit}</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={saveProfile}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save changes"}</Text>
      </TouchableOpacity>

      {/* Feedback — opens the feedback screen (owned by the feedback feature) */}
      <TouchableOpacity style={styles.rowBtn} onPress={() => router.push('/feedback')}>
        <Ionicons name="chatbox-ellipses-outline" size={18} color={COLORS.button} />
        <Text style={styles.rowBtnText}>Send feedback</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.placeholderText} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#a32d2d" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
