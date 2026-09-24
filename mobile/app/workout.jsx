import { View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, BackHandler
} from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import COLORS from "../constants/colors"
import styles from '../assets/styles/workout.style'
import api from '../lib/axios'

const emptyExercise = () => ({
  name: '',
  sets: [{ reps: '', weightKg: '', restSeconds: '60', completed: false }]
});

export default function Workout() {
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  //  ADD WORKOUT MODAL STATE 
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newExercises, setNewExercises] = useState([emptyExercise()]);
  const [saving, setSaving] = useState(false);

  //  THREE DOTS MENU STATE 
  const [menuWorkout, setMenuWorkout] = useState(null);

  //  EDIT MODAL STATE 
  const [showEdit, setShowEdit] = useState(false);
  const [editWorkout, setEditWorkout] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExercises, setEditExercises] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadWorkouts(); }, []);

  //  ANDROID HARDWARE BACK BUTTON 
  useEffect(() => {
    const backAction = () => {
      if (showAdd) { setShowAdd(false); return true; }
      if (showEdit) { setShowEdit(false); return true; }
      if (menuWorkout) { setMenuWorkout(null); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [showAdd, showEdit, menuWorkout]);

  const loadWorkouts = async () => {
    try {
      const res = await api.get("/workouts?completed=false");
      setWorkouts(res.data);
    } catch (error) {
      console.log("Failed to load workouts", error.message);
    } finally {
      setLoading(false);
    }
  };

  //  OPEN ADD MODAL (always starts fresh) 
  const openAddModal = () => {
    setNewTitle('');
    setNewExercises([emptyExercise()]);
    setShowAdd(true);
  };

  //  ADD MODAL HELPERS 
  const updateNewExerciseName = (exIdx, name) => {
    const updated = [...newExercises];
    updated[exIdx] = { ...updated[exIdx], name };
    setNewExercises(updated);
  };

  const updateNewSet = (exIdx, setIdx, field, value) => {
    const updated = [...newExercises];
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
    setNewExercises(updated);
  };

  const addSetToNewExercise = (exIdx) => {
    const updated = [...newExercises];
    updated[exIdx].sets.push({ reps: '', weightKg: '', restSeconds: '60', completed: false });
    setNewExercises(updated);
  };

  const removeNewSet = (exIdx, setIdx) => {
    const updated = [...newExercises];
    updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx);
    setNewExercises(updated);
  };

  const addNewExercise = () => {
    setNewExercises([...newExercises, emptyExercise()]);
  };

  const removeNewExercise = (exIdx) => {
    setNewExercises(newExercises.filter((_, i) => i !== exIdx));
  };

  //  OPEN EDIT MODAL 
  const openEdit = (w) => {
    setMenuWorkout(null);
    setEditWorkout(w);
    setEditTitle(w.title || '');
    setEditExercises(w.exercises?.map(ex => ({
      name: ex.name || '',
      sets: ex.sets?.map(s => ({
        reps: s.reps?.toString() || '',
        weightKg: s.weightKg?.toString() || '',
        restSeconds: s.restSeconds?.toString() || '60',
        completed: s.completed || false,
      })) || []
    })) || []);
    setShowEdit(true);
  };

  //  EDIT HELPERS 
  const updateExerciseName = (exIdx, name) => {
    const updated = [...editExercises];
    updated[exIdx] = { ...updated[exIdx], name };
    setEditExercises(updated);
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    const updated = [...editExercises];
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
    setEditExercises(updated);
  };

  const addSetToExercise = (exIdx) => {
    const updated = [...editExercises];
    updated[exIdx].sets.push({ reps: '', weightKg: '', restSeconds: '60', completed: false });
    setEditExercises(updated);
  };

  const removeSet = (exIdx, setIdx) => {
    const updated = [...editExercises];
    updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx);
    setEditExercises(updated);
  };

  const addExercise = () => {
    setEditExercises([...editExercises, {
      name: '',
      sets: [{ reps: '', weightKg: '', restSeconds: '60', completed: false }]
    }]);
  };

  const removeExercise = (exIdx) => {
    setEditExercises(editExercises.filter((_, i) => i !== exIdx));
  };

  //  SAVE EDIT 
  const saveEdit = async () => {
    if (!editTitle.trim()) { Alert.alert("Missing", "Please enter a workout title"); return; }
    setEditSaving(true);
    try {
      const payload = {
        title: editTitle.trim(),
        exercises: editExercises.map(ex => ({
          name: ex.name,
          sets: ex.sets.map(s => ({
            reps: Number(s.reps) || 0,
            weightKg: Number(s.weightKg) || 0,
            restSeconds: Number(s.restSeconds) || 60,
            completed: s.completed,
          }))
        }))
      };
      const res = await api.put(`/workouts/${editWorkout._id}`, payload);
      setWorkouts(prev => prev.map(w => w._id === editWorkout._id ? res.data : w));
      setShowEdit(false);
      setEditWorkout(null);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  //  COMPLETE WORKOUT 
  const completeWorkout = async (id) => {
    try {
      await api.patch(`/workouts/${id}/complete`);
      setWorkouts(prev => prev.filter(w => w._id !== id));
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to complete workout");
    }
  };

  //  DELETE WORKOUT 
  const confirmDelete = (id, title) => {
    setMenuWorkout(null);
    Alert.alert(
      "Delete workout",
      `Remove "${title || "this workout"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteWorkout(id) },
      ]
    );
  };

  const deleteWorkout = async (id) => {
    try {
      await api.delete(`/workouts/${id}`);
      setWorkouts(prev => prev.filter(w => w._id !== id));
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to delete");
    }
  };

  //  SAVE NEW WORKOUT 
  const saveWorkout = async () => {
    if (!newTitle.trim()) { Alert.alert("Missing", "Please enter a workout title"); return; }

    const validExercises = newExercises.filter(ex => ex.name.trim());
    if (validExercises.length === 0) {
      Alert.alert("Missing", "Please add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: newTitle.trim(),
        date: new Date().toISOString(),
        exercises: validExercises.map(ex => ({
          name: ex.name.trim(),
          sets: ex.sets.map(s => ({
            reps: Number(s.reps) || 0,
            weightKg: Number(s.weightKg) || 0,
            restSeconds: Number(s.restSeconds) || 60,
            completed: false,
          }))
        })),
      };
      const res = await api.post("/workouts", payload);
      setWorkouts(prev => [res.data, ...prev]);
      setShowAdd(false);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workouts</Text>
        <TouchableOpacity onPress={openAddModal}>
          <Ionicons name="add" size={28} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      {/* WORKOUT LIST */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.button} style={{ marginTop: 40 }} />
        ) : workouts.length === 0 ? (
          <Text style={styles.empty}>No workouts yet — tap + to add one</Text>
        ) : (
          workouts.map((w) => (
            <View key={w._id} style={styles.workoutCard}>
              {/* card top: title + ⋮ */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workoutTitle}>{w.title || "Workout"}</Text>
                  <Text style={styles.workoutDate}>
                    {new Date(w.date).toLocaleDateString()}
                  </Text>
                </View>
                {/* THREE DOTS */}
                <TouchableOpacity
                  onPress={() => setMenuWorkout(w)}
                  hitSlop={10}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={COLORS.placeholderText} />
                </TouchableOpacity>
              </View>

              {/* exercises */}
              {w.exercises?.map((ex, i) => (
                <View key={i} style={styles.exerciseBlock}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  {ex.sets?.map((s, si) => (
                    <Text key={si} style={styles.setLine}>
                      Set {si + 1}: {s.reps || 0} reps × {s.weightKg || 0} kg · {s.restSeconds || 60}s rest
                    </Text>
                  ))}
                </View>
              ))}

              {/* complete button */}
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => completeWorkout(w._id)}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                <Text style={styles.completeText}>Mark Complete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── THREE DOTS MENU OVERLAY (was Modal — Modal's separate native window
           doesn't resize with the keyboard under Android edge-to-edge) ── */}
      {!!menuWorkout && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50, elevation: 50,
        }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
            activeOpacity={1}
            onPress={() => setMenuWorkout(null)}
          >
            <View style={{
              position: 'absolute',
              bottom: insets.bottom + 16,
              left: 24, right: 24,
              backgroundColor: COLORS.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
            }}>
              {/* header */}
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.black }}>
                  {menuWorkout?.title || "Workout"}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
                  {menuWorkout ? new Date(menuWorkout.date).toLocaleDateString() : ''}
                </Text>
              </View>

              {/* EDIT */}
              <TouchableOpacity
                onPress={() => openEdit(menuWorkout)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
                }}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.button} />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.button }}>
                    Edit workout
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 1 }}>
                    Change title, add or remove exercises
                  </Text>
                </View>
              </TouchableOpacity>

              {/* DELETE */}
              <TouchableOpacity
                onPress={() => confirmDelete(menuWorkout?._id, menuWorkout?.title)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}
              >
                <Ionicons name="trash-outline" size={20} color="#E24B4A" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#E24B4A' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/*  EDIT WORKOUT OVERLAY  */}
      {showEdit && (
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 60, elevation: 60,
      }}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center', alignItems: 'center', padding: 20,
        }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxWidth: 480, maxHeight: '85%' }}
          >
            <View style={{
              backgroundColor: COLORS.white,
              borderRadius: 20,
              overflow: 'hidden',
              maxHeight: '100%',
            }}>
              {/* edit header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                padding: 20,
                borderBottomWidth: 1, borderBottomColor: COLORS.border,
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.black }}>
                  Edit Workout
                </Text>
                <TouchableOpacity onPress={() => setShowEdit(false)}>
                  <Ionicons name="close" size={24} color={COLORS.black} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* title */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 6 }}>
                  WORKOUT TITLE
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                    padding: 12, fontSize: 15, color: COLORS.black,
                    backgroundColor: COLORS.inputBackground, marginBottom: 20,
                  }}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="e.g. Upper Body Day"
                  placeholderTextColor={COLORS.placeholderText}
                />

                {/* exercises */}
                {editExercises.map((ex, exIdx) => (
                  <View key={exIdx} style={{
                    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
                    padding: 14, marginBottom: 16, backgroundColor: COLORS.inputBackground,
                  }}>
                    {/* exercise name + remove */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <TextInput
                        style={{
                          flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
                          padding: 10, fontSize: 14, color: COLORS.black, backgroundColor: COLORS.white,
                        }}
                        value={ex.name}
                        onChangeText={(t) => updateExerciseName(exIdx, t)}
                        placeholder="Exercise name"
                        placeholderTextColor={COLORS.placeholderText}
                      />
                      <TouchableOpacity onPress={() => removeExercise(exIdx)} hitSlop={8}>
                        <Ionicons name="close-circle" size={22} color="#E24B4A" />
                      </TouchableOpacity>
                    </View>

                    {/* sets */}
                    {ex.sets.map((s, setIdx) => (
                      <View key={setIdx} style={{
                        flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray, width: 36 }}>
                          Set {setIdx + 1}
                        </Text>
                        <TextInput
                          style={{
                            flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
                            padding: 8, fontSize: 13, color: COLORS.black,
                            backgroundColor: COLORS.white, textAlign: 'center',
                          }}
                          value={s.reps}
                          onChangeText={(t) => updateSet(exIdx, setIdx, 'reps', t)}
                          placeholder="Reps"
                          placeholderTextColor={COLORS.placeholderText}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={{
                            flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
                            padding: 8, fontSize: 13, color: COLORS.black,
                            backgroundColor: COLORS.white, textAlign: 'center',
                          }}
                          value={s.weightKg}
                          onChangeText={(t) => updateSet(exIdx, setIdx, 'weightKg', t)}
                          placeholder="kg"
                          placeholderTextColor={COLORS.placeholderText}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity onPress={() => removeSet(exIdx, setIdx)} hitSlop={8}>
                          <Ionicons name="remove-circle-outline" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* add set */}
                    <TouchableOpacity
                      onPress={() => addSetToExercise(exIdx)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={COLORS.button} />
                      <Text style={{ fontSize: 13, color: COLORS.button, fontWeight: '600' }}>
                        Add set
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* add exercise */}
                <TouchableOpacity
                  onPress={addExercise}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: 14, borderRadius: 12,
                    borderWidth: 1, borderColor: COLORS.border,
                    borderStyle: 'dashed', marginBottom: 20,
                  }}
                >
                  <Ionicons name="add" size={20} color={COLORS.button} />
                  <Text style={{ fontSize: 15, color: COLORS.button, fontWeight: '600' }}>
                    Add exercise
                  </Text>
                </TouchableOpacity>

                {/* save */}
                <TouchableOpacity
                  onPress={saveEdit}
                  disabled={editSaving}
                  style={{
                    backgroundColor: COLORS.button, borderRadius: 12, padding: 16,
                    alignItems: 'center', opacity: editSaving ? 0.6 : 1, marginBottom: 8,
                  }}
                >
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700' }}>
                    {editSaving ? 'Saving...' : 'Save changes'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
      )}

      {/*  ADD WORKOUT OVERLAY   */}
      {showAdd && (
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 70, elevation: 70,
      }}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center', alignItems: 'center', padding: 20,
        }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxWidth: 480, maxHeight: '85%' }}
          >
            <View style={{
              backgroundColor: COLORS.white,
              borderRadius: 20,
              overflow: 'hidden',
              maxHeight: '100%',
            }}>
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between',
                alignItems: 'center', padding: 20,
                borderBottomWidth: 1, borderBottomColor: COLORS.border,
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.black }}>
                  New Workout
                </Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Ionicons name="close" size={24} color={COLORS.black} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.inputLabel}>Routine Name</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 20 }]}
                  placeholder="e.g Upper Body Day"
                  placeholderTextColor={COLORS.placeholderText}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                {/* exercises */}
                {newExercises.map((ex, exIdx) => (
                  <View key={exIdx} style={{
                    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
                    padding: 14, marginBottom: 16, backgroundColor: COLORS.inputBackground,
                  }}>
                    {/* exercise name + remove */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <TextInput
                        style={{
                          flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
                          padding: 10, fontSize: 14, color: COLORS.black, backgroundColor: COLORS.white,
                        }}
                        value={ex.name}
                        onChangeText={(t) => updateNewExerciseName(exIdx, t)}
                        placeholder="Exercise name"
                        placeholderTextColor={COLORS.placeholderText}
                      />
                      <TouchableOpacity onPress={() => removeNewExercise(exIdx)} hitSlop={8}>
                        <Ionicons name="close-circle" size={22} color="#E24B4A" />
                      </TouchableOpacity>
                    </View>

                    {/* sets */}
                    {ex.sets.map((s, setIdx) => (
                      <View key={setIdx} style={{
                        flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray, width: 36 }}>
                          Set {setIdx + 1}
                        </Text>
                        <TextInput
                          style={{
                            flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
                            padding: 8, fontSize: 13, color: COLORS.black,
                            backgroundColor: COLORS.white, textAlign: 'center',
                          }}
                          value={s.reps}
                          onChangeText={(t) => updateNewSet(exIdx, setIdx, 'reps', t)}
                          placeholder="Reps"
                          placeholderTextColor={COLORS.placeholderText}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={{
                            flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
                            padding: 8, fontSize: 13, color: COLORS.black,
                            backgroundColor: COLORS.white, textAlign: 'center',
                          }}
                          value={s.weightKg}
                          onChangeText={(t) => updateNewSet(exIdx, setIdx, 'weightKg', t)}
                          placeholder="kg"
                          placeholderTextColor={COLORS.placeholderText}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity onPress={() => removeNewSet(exIdx, setIdx)} hitSlop={8}>
                          <Ionicons name="remove-circle-outline" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* add set */}
                    <TouchableOpacity
                      onPress={() => addSetToNewExercise(exIdx)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={COLORS.button} />
                      <Text style={{ fontSize: 13, color: COLORS.button, fontWeight: '600' }}>
                        Add set
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* add exercise — this is the button you were asking about */}
                <TouchableOpacity
                  onPress={addNewExercise}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: 14, borderRadius: 12,
                    borderWidth: 1, borderColor: COLORS.border,
                    borderStyle: 'dashed', marginBottom: 20,
                  }}
                >
                  <Ionicons name="add" size={20} color={COLORS.button} />
                  <Text style={{ fontSize: 15, color: COLORS.button, fontWeight: '600' }}>
                    Add exercise
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={saveWorkout}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Workout'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
      )}
    </View>
  );
}