import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { IBudgetStatus } from '../types';

interface Props {
  alertStatuses: IBudgetStatus[];
  onDismiss: (alertId: string) => void;
  onClose: () => void;
  visible: boolean;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

function thresholdLabel(t: number): string {
  return `${Math.round(t * 100)}% threshold reached`;
}

export function BudgetAlertSheet({ alertStatuses, onDismiss, onClose, visible }: Props) {
  if (alertStatuses.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Budget Alerts</Text>
          <ScrollView>
            {alertStatuses.map((status) => (
              <View key={status.budget.id} style={styles.alertBlock}>
                <Text style={styles.budgetName}>{status.budget.name}</Text>
                <Text style={styles.budgetInfo}>
                  Spent {formatCents(status.spentAmount)} of{' '}
                  {formatCents(status.effectiveLimitAmount)} (
                  {Math.round(status.usagePercentage * 100)}%)
                </Text>

                {status.firedAlerts
                  .filter((a) => !a.dismissed)
                  .map((alert) => (
                    <View key={alert.id} style={styles.alertRow}>
                      <Text style={styles.alertLabel}>{thresholdLabel(alert.threshold)}</Text>
                      <TouchableOpacity
                        onPress={() => onDismiss(alert.id)}
                        style={styles.dismissBtn}
                      >
                        <Text style={styles.dismissText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  alertBlock: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  budgetName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  budgetInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  alertLabel: { fontSize: 13, color: '#e65100', fontWeight: '600' },
  dismissBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e65100',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dismissText: { fontSize: 12, color: '#e65100', fontWeight: '600' },
  closeBtn: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  closeBtnText: { fontSize: 15, color: '#333', fontWeight: '600' },
});
