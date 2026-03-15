import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IBudgetStatus } from '../types';

interface Props {
  status: IBudgetStatus;
  onEdit?: () => void;
  onDelete?: () => void;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

const STATUS_COLORS = {
  ok: '#4caf50',
  warning: '#ff9800',
  exceeded: '#f44336',
};

export function BudgetProgressCard({ status, onEdit, onDelete }: Props) {
  const { budget, spentAmount, effectiveLimitAmount, usagePercentage } = status;
  const barColor = STATUS_COLORS[status.status];
  const barWidth = `${Math.min(100, usagePercentage * 100)}%`;
  const pct = Math.round(usagePercentage * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {budget.name}
        </Text>
        <View style={styles.headerActions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, styles.iconBtnDanger]}>
              <Text style={[styles.iconBtnText, styles.iconBtnDangerText]}>Del</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.amounts}>
        <Text style={styles.spent}>{formatCents(spentAmount)}</Text>
        <Text style={styles.limit}>/ {formatCents(effectiveLimitAmount)}</Text>
        <Text style={[styles.pct, { color: barColor }]}>{pct}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: barWidth as any, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.period}>{budget.period} — {status.periodLabel}</Text>
        {status.status !== 'ok' && (
          <Text style={[styles.statusBadge, { color: barColor }]}>
            {status.status === 'exceeded' ? 'Exceeded' : 'Warning'}
          </Text>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  iconBtnDanger: { backgroundColor: '#ffebee' },
  iconBtnText: { fontSize: 12, color: '#333', fontWeight: '600' },
  iconBtnDangerText: { color: '#c62828' },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  spent: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  limit: { fontSize: 14, color: '#666', marginLeft: 4 },
  pct: { fontSize: 14, fontWeight: '600', marginLeft: 'auto' },
  barTrack: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  period: { fontSize: 12, color: '#999' },
  statusBadge: { fontSize: 12, fontWeight: '600' },
});
