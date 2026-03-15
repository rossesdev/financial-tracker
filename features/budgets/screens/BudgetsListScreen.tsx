import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useBudgets } from '../hooks/useBudgets';
import { useBudgetAlerts } from '../hooks/useBudgetAlerts';
import { useBudgetsStore } from '@/store/budgetsStore';
import { BudgetProgressCard } from '../components/BudgetProgressCard';
import { BudgetAlertSheet } from '../components/BudgetAlertSheet';

export default function BudgetsListScreen() {
  const { budgetStatuses, isHydrated } = useBudgets();
  const { activeAlertStatuses, dismissAlert } = useBudgetAlerts();
  const { removeBudget } = useBudgetsStore();
  const [alertSheetVisible, setAlertSheetVisible] = useState(false);

  function handleDelete(budgetId: string, budgetName: string) {
    Alert.alert(
      'Delete Budget',
      `Delete "${budgetName}"? This will also remove all its alerts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeBudget(budgetId),
        },
      ]
    );
  }

  if (!isHydrated) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Alert banner */}
      {activeAlertStatuses.length > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => setAlertSheetVisible(true)}
        >
          <Text style={styles.alertBannerText}>
            {activeAlertStatuses.length} budget alert(s) — tap to view
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={budgetStatuses}
        keyExtractor={(item) => item.budget.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <BudgetProgressCard
            status={item}
            onDelete={() => handleDelete(item.budget.id, item.budget.name)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No budgets yet.</Text>
            <Text style={styles.emptyHint}>Tap + to create a spending limit.</Text>
          </View>
        }
      />

      <BudgetAlertSheet
        alertStatuses={activeAlertStatuses}
        onDismiss={dismissAlert}
        onClose={() => setAlertSheetVisible(false)}
        visible={alertSheetVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { color: '#666', fontSize: 15 },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#999' },
  alertBanner: {
    backgroundColor: '#e65100',
    padding: 12,
    alignItems: 'center',
  },
  alertBannerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
