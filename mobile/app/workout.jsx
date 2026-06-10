import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import COLORS from "../constants/colors"
import styles from '../assets/styles/workout.style'
import api from '../lib/axios'

export default function Workout() {
  const [activeWorkouts, setActiveWorkouts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // form state (inside the popup)
  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState([{ name: "", sets: [{ reps: "", weightKg: "" }] }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadActive();
  }, []);

  // load workouts that are not completed yet
  const loadActive = async () => {
    try {
      const res = await api.get("/workouts?completed=false");
      setActiveWorkouts(res.data);
    } catch (error) {
      console.log("Failed to load active workouts", error.message);
    }
  };

  // forms for workout
  const addExercise = () =>
    setExercises([...exercises, { name: "", sets: [{ reps: "", weightKg: "" }] }]);

  const removeExercise = (i) =>
    setExercises(exercises.filter((_, idx) => idx !== i));

  const updateExerciseName = (i, value) => {
    const next = [...exercises];
    next[i].name = value;
    setExercises(next);
  };

  const addSet = (exIndex) => {
    const next = [...exercises];
    next[exIndex].sets.push({ reps: "", weightKg: "" });
    setExercises(next);
  };

  const removeSet = (exIndex, setIndex) => {
    const next = [...exercises];
    next[exIndex].sets = next[exIndex].sets.filter((_, i) => i !== setIndex);
    setExercises(next);
  };

  const updateSet = (exIndex, setIndex, field, value) => {
    const next = [...exercises];
    next[exIndex].sets[setIndex][field] = value;
    setExercises(next);
  };

  const resetForm = () => {
    setTitle("");
    setExercises([{ name: "", sets: [{ reps: "", weightKg: "" }] }]);
  };

  //  save a new workout (from popup) 
  const saveWorkout = async () => {
    if (!title.trim()) {
      Alert.alert("Hold on", "Give your workout a title");
      return;
    }
    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) {
      Alert.alert("Hold on", "Add at least one exercise");
      return;
    }

    const payload = {
      title: title.trim(),
      exercises: validExercises.map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets
          .filter((s) => s.reps || s.weightKg)
          .map((s) => ({ reps: Number(s.reps) || 0, weightKg: Number(s.weightKg) || 0 })),
      })),
    };

    setSaving(true);
    try {
      await api.post("/workouts", payload);   // defaults to completed:false - active
      resetForm();
      setModalVisible(false);
      loadActive();   // refresh the list
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  //   mark a workout as done - moves to history 
  const markDone = async (id) => {
    try {
      await api.patch(`/workouts/${id}/complete`);
      loadActive();   // it leaves the active list
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to mark done");
    }
  };

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* add workout button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addBtnText}>Add workout</Text>
        </TouchableOpacity>

        {/* active workouts list */}
        <Text style={styles.sectionTitle}>Active workouts</Text>
        {activeWorkouts.length === 0 ? (
          <Text style={styles.empty}>No active workouts. Tap “Add workout” to start.</Text>
        ) : (
          activeWorkouts.map((w) => (
            <View key={w._id} style={styles.workoutCard}>
              <Text style={styles.workoutTitle}>{w.title}</Text>
              {w.exercises?.map((ex, i) => (
                <Text key={i} style={styles.workoutExercise}>
                  {ex.name} — {ex.sets?.length || 0} set(s)
                </Text>
              ))}
              <TouchableOpacity style={styles.doneBtn} onPress={() => markDone(w._id)}>
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                <Text style={styles.doneText}>Mark as done</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modals add workout form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New workout</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <TextInput
                style={styles.titleInput}
                placeholder="Workout title (e.g. Push Day)"
                placeholderTextColor={COLORS.placeholderText}
                value={title}
                onChangeText={setTitle}
              />

              {exercises.map((ex, exIndex) => (
                <View key={exIndex} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <TextInput
                      style={styles.exerciseNameInput}
                      placeholder="Exercise name"
                      placeholderTextColor={COLORS.placeholderText}
                      value={ex.name}
                      onChangeText={(t) => updateExerciseName(exIndex, t)}
                    />
                    {exercises.length > 1 && (
                      <TouchableOpacity onPress={() => removeExercise(exIndex)}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.placeholderText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {ex.sets.map((set, setIndex) => (
                    <View key={setIndex} style={styles.setRow}>
                      <Text style={styles.setLabel}>Set {setIndex + 1}</Text>
                      <TextInput
                        style={styles.setInput}
                        placeholder="reps"
                        placeholderTextColor={COLORS.placeholderText}
                        value={set.reps}
                        onChangeText={(t) => updateSet(exIndex, setIndex, "reps", t)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.times}>×</Text>
                      <TextInput
                        style={styles.setInput}
                        placeholder="kg"
                        placeholderTextColor={COLORS.placeholderText}
                        value={set.weightKg}
                        onChangeText={(t) => updateSet(exIndex, setIndex, "weightKg", t)}
                        keyboardType="numeric"
                      />
                      {ex.sets.length > 1 && (
                        <TouchableOpacity onPress={() => removeSet(exIndex, setIndex)}>
                          <Ionicons name="close" size={18} color={COLORS.placeholderText} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity onPress={() => addSet(exIndex)} style={styles.addSetBtn}>
                    <Ionicons name="add" size={16} color={COLORS.button} />
                    <Text style={styles.addSetText}>Add set</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity onPress={addExercise} style={styles.addExerciseBtn}>
                <Ionicons name="add" size={18} color={COLORS.placeholderText} />
                <Text style={styles.addExerciseText}>Add exercise</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveWorkout}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save workout"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}