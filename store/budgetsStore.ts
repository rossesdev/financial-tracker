import { create } from 'zustand';
import { SQLiteBudgetRepository } from '@/storage/repositories/sqlite/SQLiteBudgetRepository';
import { IBudget, IBudgetAlert, IBudgetStatus } from '@/features/budgets/types';
import { evaluateBudget } from '@/features/budgets/domain/budgetEvaluator';
import { useMovementsStore } from './movementsStore';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

type BudgetsState = {
  budgets: IBudget[];
  alerts: IBudgetAlert[];
  budgetStatuses: IBudgetStatus[];
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  addBudget: (budget: Omit<IBudget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (budget: IBudget) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  evaluateAll: () => void;
  dismissAlert: (alertId: string) => Promise<void>;
  fireAlert: (alert: Omit<IBudgetAlert, 'id'>) => Promise<void>;
};

export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  budgets: [],
  alerts: [],
  budgetStatuses: [],
  isHydrated: false,

  hydrate: async () => {
    const repo = new SQLiteBudgetRepository();
    const [budgets, alerts] = await Promise.all([repo.getAll(), repo.getAllAlerts()]);
    set({ budgets, alerts, isHydrated: true });
    // Evaluate budgets after hydration
    get().evaluateAll();
  },

  addBudget: async (budgetInput) => {
    const repo = new SQLiteBudgetRepository();
    const now = new Date().toISOString();
    const budget: IBudget = {
      ...budgetInput,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await repo.save(budget);
    set((state) => ({ budgets: [budget, ...state.budgets] }));
    get().evaluateAll();
  },

  updateBudget: async (budget) => {
    const repo = new SQLiteBudgetRepository();
    await repo.update(budget);
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === budget.id ? budget : b)),
    }));
    get().evaluateAll();
  },

  removeBudget: async (id) => {
    const repo = new SQLiteBudgetRepository();
    await repo.delete(id);
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
      alerts: state.alerts.filter((a) => a.budgetId !== id),
    }));
    get().evaluateAll();
  },

  evaluateAll: () => {
    const { budgets, alerts } = get();
    const allMovements = useMovementsStore.getState().movements;
    const today = new Date();
    const statuses = budgets
      .filter((b) => b.isActive)
      .map((budget) =>
        evaluateBudget(budget, allMovements, alerts, 0, today)
      );
    set({ budgetStatuses: statuses });

    // Fire any new alerts asynchronously
    const { fireAlert } = get();
    for (const status of statuses) {
      for (const threshold of status.pendingAlerts) {
        fireAlert({
          budgetId: status.budget.id,
          threshold,
          periodLabel: status.periodLabel,
          triggeredAt: today.toISOString(),
          actualAmount: status.spentAmount,
          budgetAmount: status.effectiveLimitAmount,
          dismissed: false,
        });
      }
    }
  },

  dismissAlert: async (alertId) => {
    const repo = new SQLiteBudgetRepository();
    await repo.dismissAlert(alertId);
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
      budgetStatuses: state.budgetStatuses.map((s) => ({
        ...s,
        firedAlerts: s.firedAlerts.map((a) =>
          a.id === alertId ? { ...a, dismissed: true } : a
        ),
      })),
    }));
  },

  fireAlert: async (alertInput) => {
    const repo = new SQLiteBudgetRepository();
    const alert: IBudgetAlert = {
      ...alertInput,
      id: generateId(),
    };
    await repo.saveAlert(alert);
    set((state) => ({ alerts: [...state.alerts, alert] }));
  },
}));
