import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useGoals } from '../hooks/useGoals';
import { useGoalsStore } from '@/store/goalsStore';
import { IGoalProgress } from '../types';
import { GoalProgressRing } from '../components/GoalProgressRing';
import { AddContributionSheet } from '../components/AddContributionSheet';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

interface GoalCardProps {
  progress: IGoalProgress;
  onAddContribution: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

function GoalCard({ progress, onAddContribution, onDelete, onToggleStatus }: GoalCardProps) {
  const { goal, currentAmount, progressPercentage, remainingAmount, isOverdue, daysUntilDeadline } = progress;
  const goalColor = goal.color ?? '#1565c0';
  const isCompleted = goal.status === 'completed';

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={styles.cardHeader}>
        <GoalProgressRing percentage={progressPercentage} size={72} color={goalColor} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{goal.name}</Text>
          <Text style={styles.cardSaved}>
            {formatCents(currentAmount)} / {formatCents(goal.targetAmount)}
          </Text>
          {goal.targetDate && !isCompleted && (
            <Text style={[styles.cardDeadline, isOverdue && styles.overdueText]}>
              {isOverdue
                ? 'Overdue!'
                : `${daysUntilDeadline} days left`}
            </Text>
          )}
          {isCompleted && (
            <Text style={styles.completedBadge}>Completed</Text>
          )}
        </View>
      </View>

      {!isCompleted && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: goalColor }]}
            onPress={onAddContribution}
          >
            <Text style={[styles.actionBtnText, { color: goalColor }]}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={onToggleStatus}>
            <Text style={styles.actionBtnSecondaryText}>
              {goal.status === 'paused' ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnSecondary, styles.actionBtnDanger]} onPress={onDelete}>
            <Text style={[styles.actionBtnSecondaryText, styles.dangerText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function GoalsListScreen() {
  const { goalProgresses, isHydrated } = useGoals();
  const { removeGoal, updateGoalStatus } = useGoalsStore();

  const [contributionGoal, setContributionGoal] = useState<{ id: string; name: string } | null>(
    null
  );

  function handleDelete(progress: IGoalProgress) {
    Alert.alert(
      'Delete Goal',
      `Delete "${progress.goal.name}"? All contributions will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeGoal(progress.goal.id),
        },
      ]
    );
  }

  function handleToggleStatus(progress: IGoalProgress) {
    const newStatus = progress.goal.status === 'paused' ? 'active' : 'paused';
    updateGoalStatus(progress.goal.id, newStatus);
  }

  if (!isHydrated) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading goals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={goalProgresses}
        keyExtractor={(item) => item.goal.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <GoalCard
            progress={item}
            onAddContribution={() =>
              setContributionGoal({ id: item.goal.id, name: item.goal.name })
            }
            onDelete={() => handleDelete(item)}
            onToggleStatus={() => handleToggleStatus(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No savings goals yet.</Text>
            <Text style={styles.emptyHint}>Tap + to create your first goal.</Text>
          </View>
        }
      />

      {contributionGoal && (
        <AddContributionSheet
          goalId={contributionGoal.id}
          goalName={contributionGoal.name}
          visible={true}
          onClose={() => setContributionGoal(null)}
        />
      )}
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
  cardCompleted: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  cardSaved: { fontSize: 14, color: '#333', marginBottom: 4 },
  cardDeadline: { fontSize: 12, color: '#666' },
  overdueText: { color: '#c62828', fontWeight: '600' },
  completedBadge: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '700',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  actionBtnSecondary: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnDanger: { backgroundColor: '#ffebee' },
  actionBtnSecondaryText: { fontSize: 13, color: '#333', fontWeight: '600' },
  dangerText: { color: '#c62828' },
});
