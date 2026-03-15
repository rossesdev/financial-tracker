import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { useBudgetsStore } from '@/store/budgetsStore';
import { AlertThreshold, BudgetPeriod } from '../types';
import categories from '@/config/categories.json';

const PERIODS: BudgetPeriod[] = ['weekly', 'monthly', 'quarterly', 'annual'];
const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};
const THRESHOLDS: AlertThreshold[] = [0.5, 0.75, 0.8, 0.9, 1.0];

interface AddBudgetScreenProps {
  onDone?: () => void;
}

export default function AddBudgetScreen({ onDone }: AddBudgetScreenProps) {
  const { addBudget } = useBudgetsStore();

  const [name, setName] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedThresholds, setSelectedThresholds] = useState<AlertThreshold[]>([0.8, 1.0]);
  const [rollover, setRollover] = useState(false);

  function toggleCategory(value: string) {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  function toggleThreshold(t: AlertThreshold) {
    setSelectedThresholds((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function handleSave() {
    if (!name.trim() || !limitStr.trim() || selectedCategories.length === 0) {
      Alert.alert('Validation', 'Please fill name, limit, and select at least one category.');
      return;
    }
    const limitCents = Math.round(parseFloat(limitStr.replace(',', '.')) * 100);
    if (isNaN(limitCents) || limitCents <= 0) {
      Alert.alert('Validation', 'Please enter a valid limit amount.');
      return;
    }
    await addBudget({
      name: name.trim(),
      categoryIds: selectedCategories,
      limitAmount: limitCents,
      period,
      alertThresholds: selectedThresholds,
      isActive: true,
      rollover,
    });
    onDone?.();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Budget</Text>

      <Text style={styles.label}>Budget Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Food, Transport"
      />

      <Text style={styles.label}>Monthly Limit (COP)</Text>
      <TextInput
        style={styles.input}
        value={limitStr}
        onChangeText={setLimitStr}
        keyboardType="numeric"
        placeholder="200000"
      />

      <Text style={styles.label}>Period</Text>
      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, period === p && styles.chipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.chipText, period === p && styles.chipTextActive]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Categories</Text>
      <View style={styles.chips}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, selectedCategories.includes(c.value) && styles.chipActive]}
            onPress={() => toggleCategory(c.value)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategories.includes(c.value) && styles.chipTextActive,
              ]}
            >
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Alert Thresholds</Text>
      <View style={styles.chips}>
        {THRESHOLDS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, selectedThresholds.includes(t) && styles.chipActive]}
            onPress={() => toggleThreshold(t)}
          >
            <Text
              style={[
                styles.chipText,
                selectedThresholds.includes(t) && styles.chipTextActive,
              ]}
            >
              {Math.round(t * 100)}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Rollover unused budget</Text>
        <Switch value={rollover} onValueChange={setRollover} />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Budget</Text>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
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
