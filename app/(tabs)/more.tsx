import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import RecurringDebtsScreen from '@/features/recurringDebts/screens/RecurringDebtsScreen';
import BudgetsListScreen from '@/features/budgets/screens/BudgetsListScreen';
import AddBudgetScreen from '@/features/budgets/screens/AddBudgetScreen';
import GoalsListScreen from '@/features/goals/screens/GoalsListScreen';
import AddGoalScreen from '@/features/goals/screens/AddGoalScreen';

type Section = 'home' | 'recurring' | 'budgets' | 'addBudget' | 'goals' | 'addGoal';

export default function MoreScreen() {
  const [section, setSection] = useState<Section>('home');

  if (section === 'recurring') {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection('home')} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subTitle}>Recurring Rules</Text>
        </View>
        <RecurringDebtsScreen />
      </View>
    );
  }

  if (section === 'budgets') {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection('home')} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subTitle}>Budgets</Text>
          <TouchableOpacity onPress={() => setSection('addBudget')} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
        <BudgetsListScreen />
      </View>
    );
  }

  if (section === 'addBudget') {
    return (
      <View style={styles.fullScreen}>
        <AddBudgetScreen onDone={() => setSection('budgets')} />
      </View>
    );
  }

  if (section === 'goals') {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection('home')} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subTitle}>Savings Goals</Text>
          <TouchableOpacity onPress={() => setSection('addGoal')} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
        <GoalsListScreen />
      </View>
    );
  }

  if (section === 'addGoal') {
    return (
      <View style={styles.fullScreen}>
        <AddGoalScreen onDone={() => setSection('goals')} />
      </View>
    );
  }

  // Home — feature menu
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.menuContent}>
      <Text style={styles.menuTitle}>More Features</Text>

      <TouchableOpacity style={styles.menuItem} onPress={() => setSection('recurring')}>
        <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
          <Text style={styles.menuIconText}>R</Text>
        </View>
        <View style={styles.menuTextBlock}>
          <Text style={styles.menuItemTitle}>Recurring Debts</Text>
          <Text style={styles.menuItemDesc}>
            Automate recurring expenses and income
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => setSection('budgets')}>
        <View style={[styles.menuIcon, { backgroundColor: '#fce4ec' }]}>
          <Text style={styles.menuIconText}>B</Text>
        </View>
        <View style={styles.menuTextBlock}>
          <Text style={styles.menuItemTitle}>Budgets</Text>
          <Text style={styles.menuItemDesc}>
            Set category spending limits with alerts
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => setSection('goals')}>
        <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
          <Text style={styles.menuIconText}>G</Text>
        </View>
        <View style={styles.menuTextBlock}>
          <Text style={styles.menuItemTitle}>Savings Goals</Text>
          <Text style={styles.menuItemDesc}>
            Track progress toward financial goals
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  menuContent: { padding: 24, paddingTop: 32 },
  menuTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIconText: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  menuTextBlock: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  menuItemDesc: { fontSize: 13, color: '#666' },
  chevron: { fontSize: 22, color: '#bbb', fontWeight: '300' },
  fullScreen: { flex: 1, backgroundColor: '#f5f5f5' },
  subHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    paddingRight: 16,
    paddingVertical: 4,
  },
  backText: { fontSize: 16, color: '#1565c0', fontWeight: '600' },
  subTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  addBtn: {
    paddingLeft: 16,
    paddingVertical: 4,
  },
  addBtnText: { fontSize: 15, color: '#1565c0', fontWeight: '600' },
});
