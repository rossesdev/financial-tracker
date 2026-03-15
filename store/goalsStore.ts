import { create } from 'zustand';
import { SQLiteGoalRepository } from '@/storage/repositories/sqlite/SQLiteGoalRepository';
import { IGoal, IGoalContribution, IGoalProgress, GoalStatus } from '@/features/goals/types';
import { computeGoalProgress, shouldAutoComplete } from '@/features/goals/domain/goalCalculations';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

type GoalsState = {
  goals: IGoal[];
  goalProgresses: IGoalProgress[];
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  addGoal: (goal: Omit<IGoal, 'id' | 'contributions' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (goal: IGoal) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  updateGoalStatus: (id: string, status: GoalStatus) => Promise<void>;
  addContribution: (
    goalId: string,
    contribution: Omit<IGoalContribution, 'id' | 'goalId'>
  ) => Promise<void>;
  removeContribution: (contributionId: string, goalId: string) => Promise<void>;
  removeContributionByMovementId: (movementId: string) => Promise<void>;
  getContributionByMovementId: (movementId: string) => Promise<IGoalContribution | null>;
  recomputeProgresses: () => void;
};

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  goalProgresses: [],
  isHydrated: false,

  hydrate: async () => {
    const repo = new SQLiteGoalRepository();
    const goals = await repo.getAll();
    set({ goals, isHydrated: true });
    get().recomputeProgresses();
  },

  addGoal: async (goalInput) => {
    const repo = new SQLiteGoalRepository();
    const now = new Date().toISOString();
    const goal: IGoal = {
      ...goalInput,
      id: generateId(),
      contributions: [],
      createdAt: now,
      updatedAt: now,
    };
    await repo.save(goal);
    set((state) => ({ goals: [goal, ...state.goals] }));
    get().recomputeProgresses();
  },

  updateGoal: async (goal) => {
    const repo = new SQLiteGoalRepository();
    await repo.update(goal);
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goal.id ? goal : g)),
    }));
    get().recomputeProgresses();
  },

  removeGoal: async (id) => {
    const repo = new SQLiteGoalRepository();
    await repo.delete(id);
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));
    get().recomputeProgresses();
  },

  updateGoalStatus: async (id, status) => {
    const repo = new SQLiteGoalRepository();
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const updated: IGoal = { ...goal, status, updatedAt: new Date().toISOString() };
    await repo.update(updated);
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? updated : g)),
    }));
    get().recomputeProgresses();
  },

  addContribution: async (goalId, contributionInput) => {
    const repo = new SQLiteGoalRepository();
    const contribution: IGoalContribution = {
      ...contributionInput,
      id: generateId(),
      goalId,
    };
    await repo.addContribution(contribution);

    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.id !== goalId) return g;
        const updated = { ...g, contributions: [...g.contributions, contribution] };
        // Auto-complete if target reached
        if (shouldAutoComplete(updated)) {
          return { ...updated, status: 'completed' as GoalStatus, updatedAt: new Date().toISOString() };
        }
        return updated;
      }),
    }));
    get().recomputeProgresses();
  },

  removeContribution: async (contributionId, goalId) => {
    const repo = new SQLiteGoalRepository();
    await repo.deleteContribution(contributionId);
    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          contributions: g.contributions.filter((c) => c.id !== contributionId),
        };
      }),
    }));
    get().recomputeProgresses();
  },

  removeContributionByMovementId: async (movementId) => {
    const repo = new SQLiteGoalRepository();
    const contribution = await repo.getContributionByMovementId(movementId);
    if (!contribution) return;
    await repo.deleteContribution(contribution.id);
    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.id !== contribution.goalId) return g;
        return {
          ...g,
          contributions: g.contributions.filter((c) => c.id !== contribution.id),
        };
      }),
    }));
    get().recomputeProgresses();
  },

  getContributionByMovementId: async (movementId) => {
    const repo = new SQLiteGoalRepository();
    return repo.getContributionByMovementId(movementId);
  },

  recomputeProgresses: () => {
    const today = new Date();
    const progresses = get().goals.map((g) => computeGoalProgress(g, today));
    set({ goalProgresses: progresses });
  },
}));
