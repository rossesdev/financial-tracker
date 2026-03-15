import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useGoalsStore } from '@/store/goalsStore';
import categories from '@/config/categories.json';

const GOAL_COLORS = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#c62828', '#00838f'];

interface AddGoalScreenProps {
  onDone?: () => void;
}

export default function AddGoalScreen({ onDone }: AddGoalScreenProps) {
  const { addGoal } = useGoalsStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState(categories[0]?.value ?? '1');
  const [color, setColor] = useState(GOAL_COLORS[0]);

  async function handleSave() {
    if (!name.trim() || !targetStr.trim()) {
      Alert.alert('Validation', 'Please enter a name and target amount.');
      return;
    }
    const targetCents = Math.round(parseFloat(targetStr.replace(',', '.')) * 100);
    if (isNaN(targetCents) || targetCents <= 0) {
      Alert.alert('Validation', 'Please enter a valid target amount.');
      return;
    }
    await addGoal({
      name: name.trim(),
      description: description.trim() || undefined,
      targetAmount: targetCents,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      category,
      status: 'active',
      color,
    });
    onDone?.();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Goal</Text>

      <Text style={styles.label}>Goal Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Emergency Fund, Vacation"
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="What is this goal for?"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Target Amount (COP)</Text>
      <TextInput
        style={styles.input}
        value={targetStr}
        onChangeText={setTargetStr}
        keyboardType="numeric"
        placeholder="1000000"
      />

      <Text style={styles.label}>Target Date (YYYY-MM-DD, optional)</Text>
      <TextInput
        style={styles.input}
        value={targetDate}
        onChangeText={setTargetDate}
        placeholder="2026-12-31"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, category === c.value && styles.chipActive]}
            onPress={() => setCategory(c.value)}
          >
            <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Color</Text>
      <View style={styles.colorPicker}>
        {GOAL_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              color === c && styles.colorDotSelected,
            ]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Create Goal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => onDone?.()}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: '#1565c0', borderColor: '#1565c0' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: '#fff' },
  colorPicker: { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  saveBtn: {
    backgroundColor: '#1565c0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: { color: '#666', fontSize: 15 },
});
