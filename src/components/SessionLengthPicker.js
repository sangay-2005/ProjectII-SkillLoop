import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRESETS = [30, 45, 60, 90, 120]; // minutes
const MIN = 10;
const MAX = 480;

// Pick a ready-made session length, or choose "Custom" and type your own minutes.
// value = minutes (number) or null; onChange(minutes | null)
export default function SessionLengthPicker({ value, onChange }) {
  const isPreset = PRESETS.includes(value);
  // a saved length that is not in the list (e.g. 75) opens in Custom mode
  const [custom, setCustom] = useState(value != null && !isPreset);
  const [text, setText] = useState(value != null && !isPreset ? String(value) : '');

  const pickPreset = (mins) => {
    setCustom(false);
    onChange(mins);
  };

  const startCustom = () => {
    setCustom(true);
    const start = value != null ? String(value) : '60';
    setText(start);
    onChange(parseInt(start, 10));
  };

  const typeMinutes = (t) => {
    const digits = t.replace(/[^0-9]/g, '').slice(0, 3);
    setText(digits);
    const n = parseInt(digits, 10);
    onChange(n >= MIN && n <= MAX ? n : null);
  };

  const step = (delta) => {
    const base = parseInt(text, 10) || 60;
    const next = Math.min(MAX, Math.max(MIN, base + delta));
    setText(String(next));
    onChange(next);
  };

  const chip = (label, selected, onPress) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {selected && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );

  const n = parseInt(text, 10);
  const invalid = custom && !(n >= MIN && n <= MAX);

  return (
    <View>
      <View style={styles.row}>
        {PRESETS.map((mins) => chip(`${mins} mins`, !custom && value === mins, () => pickPreset(mins)))}
        {chip('Custom', custom, startCustom)}
      </View>

      {custom && (
        <View style={styles.customBox}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => step(-5)}>
            <Ionicons name="remove" size={20} color="#1F456D" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={typeMinutes}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="60"
            placeholderTextColor="#8D99AE"
          />
          <Text style={styles.unit}>minutes</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => step(5)}>
            <Ionicons name="add" size={20} color="#1F456D" />
          </TouchableOpacity>
        </View>
      )}
      {invalid && <Text style={styles.error}>Enter between {MIN} and {MAX} minutes.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5',
    backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, marginRight: 8, marginBottom: 8,
  },
  chipSelected: { backgroundColor: '#1F456D', borderColor: '#1F456D' },
  chipText: { fontSize: 13, color: '#1F456D', fontWeight: '600' },
  customBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF7F0', borderRadius: 14,
    padding: 8, marginTop: 2, marginBottom: 4, alignSelf: 'flex-start',
  },
  stepBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FBF0DC',
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    minWidth: 60, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#1F456D',
    paddingVertical: 4, marginHorizontal: 6,
  },
  unit: { fontSize: 13, color: '#5F6368', marginRight: 10 },
  error: { color: '#D62828', fontSize: 12, marginTop: 4 },
});
