import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useRecurringDebtsStore } from '@/store/recurringDebtsStore';
import { IRecurringDebt, RecurrenceFrequency } from '../types';
import { RecurringRuleCard } from '../components/RecurringRuleCard';
import categories from '@/config/categories.json';

const FREQUENCIES: RecurrenceFrequency[] = [
  'weekly', 'biweekly', 'monthly', 'quarterly', 'annual',
];

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export default function RecurringDebtsScreen() {
  const {
    recurringDebts,
    isHydrated,
    hydrate,
    addRecurringDebt,
    updateRecurringDebt,
    removeRecurringDebt,
    pendingConfirmations,
    confirmAndPostDebt,
    dismissPendingConfirmation,
  } = useRecurringDebtsStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(categories[0]?.value ?? '1');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [autoPost, setAutoPost] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  function resetForm() {
    setName('');
    setAmountStr('');
    setCategory(categories[0]?.value ?? '1');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().slice(0, 10));
    setAutoPost(false);
    setEstimatedAmount(false);
  }

  function handleAdd() {
    const amountCents = Math.round(parseFloat(amountStr.replace(',', '.')) * 100);
    if (!name.trim() || isNaN(amountCents) || amountCents <= 0) {
      Alert.alert('Validation', 'Please enter a valid name and amount.');
      return;
    }
    const isoStart = new Date(startDate).toISOString();
    addRecurringDebt({
      name: name.trim(),
      amount: amountCents,
      category,
      frequency,
      startDate: isoStart,
      nextDueDate: isoStart,
      isActive: true,
      autoPost,
      estimatedAmount,
    });
    resetForm();
    setShowAddModal(false);
  }

  function handleTogglePause(debt: IRecurringDebt) {
    updateRecurringDebt({
      ...debt,
      isActive: !debt.isActive,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleDelete(debt: IRecurringDebt) {
    Alert.alert(
      'Delete Recurring Rule',
      `Are you sure you want to delete "${debt.name}"? This will not delete previously created movements.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeRecurringDebt(debt.id),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Pending confirmations banner */}
      {pendingConfirmations.length > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingTitle}>
            {pendingConfirmations.length} due recurring payment(s) need confirmation
          </Text>
          {pendingConfirmations.map((debt) => (
            <View key={debt.id} style={styles.pendingRow}>
              <Text style={styles.pendingName} numberOfLines={1}>
                {debt.name}
              </Text>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => confirmAndPostDebt(debt)}
                >
                  <Text style={styles.confirmBtnText}>Post</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => dismissPendingConfirmation(debt.id)}
                >
                  <Text style={styles.skipBtnText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={recurringDebts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RecurringRuleCard
            debt={item}
            onTogglePause={handleTogglePause}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recurring rules yet.</Text>
            <Text style={styles.emptyHint}>
              Tap + to add recurring expenses or income.
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Recurring Rule</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Netflix, Rent"
          />

          <Text style={styles.label}>Amount (COP)</Text>
          <TextInput
            style={styles.input}
            value={amountStr}
            onChangeText={setAmountStr}
            keyboardType="numeric"
            placeholder="50000"
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

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.chips}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, frequency === f && styles.chipActive]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>
                  {FREQUENCY_LABELS[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-03-01"
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Auto-post when due</Text>
            <Switch value={autoPost} onValueChange={setAutoPost} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Estimated amount</Text>
            <Switch value={estimatedAmount} onValueChange={setEstimatedAmount} />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#999' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1565c0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  pendingBanner: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: '#f9a825',
    margin: 12,
    borderRadius: 8,
    padding: 12,
  },
  pendingTitle: { fontSize: 14, fontWeight: '600', color: '#5d4037', marginBottom: 8 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pendingName: { fontSize: 14, color: '#333', flex: 1, marginRight: 8 },
  pendingActions: { flexDirection: 'row', gap: 6 },
  confirmBtn: {
    backgroundColor: '#1565c0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  skipBtn: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  skipBtnText: { color: '#666', fontSize: 12 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalContent: { padding: 24, paddingBottom: 60 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, color: '#1a1a1a' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
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
    marginTop: 14,
  },
  saveBtn: {
    backgroundColor: '#1565c0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtnText: { color: '#666', fontSize: 15 },
});
