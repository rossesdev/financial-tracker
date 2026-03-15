import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { IRecurringDebt } from '../types';

interface Props {
  debt: IRecurringDebt;
  onTogglePause: (debt: IRecurringDebt) => void;
  onDelete: (debt: IRecurringDebt) => void;
}

const FREQUENCY_LABELS: Record<IRecurringDebt['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

export function RecurringRuleCard({ debt, onTogglePause, onDelete }: Props) {
  const nextDue = new Date(debt.nextDueDate).toLocaleDateString('en-CA');

  return (
    <View style={[styles.card, !debt.isActive && styles.cardInactive]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {debt.name}
        </Text>
        <Text style={styles.amount}>{formatCents(debt.amount)}</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {FREQUENCY_LABELS[debt.frequency]} — Next: {nextDue}
        </Text>
        {debt.autoPost && (
          <Text style={styles.badge}>Auto-post</Text>
        )}
        {debt.estimatedAmount && (
          <Text style={[styles.badge, styles.badgeEstimate]}>Estimated</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, debt.isActive ? styles.btnPause : styles.btnResume]}
          onPress={() => onTogglePause(debt)}
        >
          <Text style={styles.btnText}>{debt.isActive ? 'Pause' : 'Resume'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnDelete]}
          onPress={() => onDelete(debt)}
        >
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInactive: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e53935',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    marginRight: 6,
  },
  badge: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeEstimate: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnPause: {
    backgroundColor: '#f5f5f5',
  },
  btnResume: {
    backgroundColor: '#e8f5e9',
  },
  btnDelete: {
    backgroundColor: '#ffebee',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
