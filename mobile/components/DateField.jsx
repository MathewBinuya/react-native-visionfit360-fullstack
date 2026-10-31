import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { formatDob } from '../lib/age';

// Themed date-of-birth field. Shows a tappable box with the selected date (or a
// placeholder) and opens the native picker. Android uses the imperative dialog
// (closes itself); iOS shows an inline spinner in a bottom sheet with Done/Cancel
// so the user commits explicitly. Reused by onboarding + edit-profile.
export default function DateField({
  value,                 // Date | null
  onChange,              // (Date) => void
  placeholder = 'Select date',
  maximumDate,
  minimumDate,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value || maximumDate || new Date());

  const openPicker = () => {
    if (disabled) return;
    setTemp(value || maximumDate || new Date());
    setOpen(true);
  };

  // Android: fires once per interaction. 'set' => committed, otherwise cancelled.
  const onAndroidChange = (event, selected) => {
    setOpen(false);
    if (event?.type === 'set' && selected) onChange(selected);
  };

  const label = value ? formatDob(value) : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.box, disabled && styles.boxDisabled]}
        onPress={openPicker}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.text, !value && styles.placeholder]}>{label}</Text>
        <Ionicons name="calendar-outline" size={18} color={COLORS.placeholderText} />
      </TouchableOpacity>

      {/* Android: native dialog, no extra chrome */}
      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={temp}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={onAndroidChange}
        />
      )}

      {/* iOS: inline spinner in a bottom sheet with explicit Cancel / Done */}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { onChange(temp); setOpen(false); }}>
                  <Text style={styles.done}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={temp}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onChange={(_e, selected) => selected && setTemp(selected)}
                style={{ alignSelf: 'stretch' }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
  },
  boxDisabled: { opacity: 0.6 },
  text: { fontSize: 14, color: COLORS.black, fontFamily: 'GeneralSans-Variable' },
  placeholder: { color: COLORS.placeholderText },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cancel: { fontSize: 15, color: COLORS.placeholderText, fontFamily: 'GeneralSans-Variable' },
  done: { fontSize: 15, fontWeight: '700', color: COLORS.button, fontFamily: 'GeneralSans-Variable' },
});
