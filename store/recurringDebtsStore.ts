import { create } from 'zustand';
import { SQLiteRecurringDebtRepository } from '@/storage/repositories/sqlite/SQLiteRecurringDebtRepository';
import { IRecurringDebt, IRecurringMovementLink } from '@/features/recurringDebts/types';
import {
  getDueRules,
  getMissedPeriods,
  advanceNextDueDate,
  computePeriodLabel,
} from '@/features/recurringDebts/domain/recurringDebtScheduler';
import { useMovementsStore } from './movementsStore';
import { parseISO } from 'date-fns';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

type RecurringDebtsState = {
  recurringDebts: IRecurringDebt[];
  isHydrated: boolean;
  pendingConfirmations: IRecurringDebt[];

  hydrate: () => Promise<void>;
  addRecurringDebt: (
    debt: Omit<IRecurringDebt, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateRecurringDebt: (debt: IRecurringDebt) => Promise<void>;
  removeRecurringDebt: (id: string) => Promise<void>;
  checkAndPostDueDebts: () => Promise<void>;
  dismissPendingConfirmation: (id: string) => void;
  confirmAndPostDebt: (debt: IRecurringDebt) => Promise<void>;
};

export const useRecurringDebtsStore = create<RecurringDebtsState>((set, get) => ({
  recurringDebts: [],
  isHydrated: false,
  pendingConfirmations: [],

  hydrate: async () => {
    const repo = new SQLiteRecurringDebtRepository();
    const debts = await repo.getAll();
    set({ recurringDebts: debts, isHydrated: true });
  },

  addRecurringDebt: async (debtInput) => {
    const repo = new SQLiteRecurringDebtRepository();
    const now = new Date().toISOString();
    const debt: IRecurringDebt = {
      ...debtInput,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await repo.save(debt);
    set((state) => ({ recurringDebts: [debt, ...state.recurringDebts] }));
  },

  updateRecurringDebt: async (debt) => {
    const repo = new SQLiteRecurringDebtRepository();
    await repo.update(debt);
    set((state) => ({
      recurringDebts: state.recurringDebts.map((d) => (d.id === debt.id ? debt : d)),
    }));
  },

  removeRecurringDebt: async (id) => {
    const repo = new SQLiteRecurringDebtRepository();
    await repo.delete(id);
    set((state) => ({
      recurringDebts: state.recurringDebts.filter((d) => d.id !== id),
      pendingConfirmations: state.pendingConfirmations.filter((d) => d.id !== id),
    }));
  },

  checkAndPostDueDebts: async () => {
    const repo = new SQLiteRecurringDebtRepository();
    const today = new Date();
    const activeDebts = await repo.getActive();
    const allLinks = await repo.getAllLinks();

    // Auto-deactivate rules whose endDate has passed
    for (const debt of activeDebts) {
      if (debt.endDate && parseISO(debt.endDate) < today) {
        const updated = { ...debt, isActive: false, updatedAt: new Date().toISOString() };
        await repo.update(updated);
      }
    }

    const dueDebts = getDueRules(activeDebts, allLinks, today);

    const autoPost: IRecurringDebt[] = [];
    const manual: IRecurringDebt[] = [];

    for (const debt of dueDebts) {
      if (debt.autoPost) {
        autoPost.push(debt);
      } else {
        manual.push(debt);
      }
    }

    // Auto-post all due debts that have autoPost = true
    for (const debt of autoPost) {
      const missedPeriods = getMissedPeriods(debt, allLinks, today);
      for (const { date, periodLabel } of missedPeriods) {
        const movementsStore = useMovementsStore.getState();
        movementsStore.addMovement({
          description: debt.name,
          amount: debt.amount,
          typeOfMovement: '2', // expense by default
          category: debt.category,
          entity: debt.entity,
          date,
        });
        // The movement was just added — get its id from the latest movement
        const latestMovements = useMovementsStore.getState().movements;
        const newMovement = latestMovements[0];
        if (newMovement) {
          const link: IRecurringMovementLink = {
            recurringDebtId: debt.id,
            movementId: newMovement.id,
            periodLabel,
            actualAmount: debt.amount,
          };
          await repo.saveLink(link);
        }
      }

      // Advance nextDueDate past today
      let nextDue = parseISO(debt.nextDueDate);
      while (nextDue <= today) {
        nextDue = advanceNextDueDate(nextDue, debt.frequency);
      }
      const updatedDebt: IRecurringDebt = {
        ...debt,
        nextDueDate: nextDue.toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repo.update(updatedDebt);
    }

    // Queue manual debts for user confirmation
    if (manual.length > 0) {
      set((state) => ({
        pendingConfirmations: [
          ...state.pendingConfirmations.filter(
            (p) => !manual.find((m) => m.id === p.id)
          ),
          ...manual,
        ],
      }));
    }

    // Refresh store state
    const refreshed = await repo.getAll();
    set({ recurringDebts: refreshed });
  },

  dismissPendingConfirmation: (id) => {
    set((state) => ({
      pendingConfirmations: state.pendingConfirmations.filter((d) => d.id !== id),
    }));
  },

  confirmAndPostDebt: async (debt) => {
    const repo = new SQLiteRecurringDebtRepository();
    const today = new Date();
    const allLinks = await repo.getAllLinks();
    const missedPeriods = getMissedPeriods(debt, allLinks, today);

    for (const { date, periodLabel } of missedPeriods) {
      const movementsStore = useMovementsStore.getState();
      movementsStore.addMovement({
        description: debt.name,
        amount: debt.amount,
        typeOfMovement: '2',
        category: debt.category,
        entity: debt.entity,
        date,
      });
      const latestMovements = useMovementsStore.getState().movements;
      const newMovement = latestMovements[0];
      if (newMovement) {
        const link: IRecurringMovementLink = {
          recurringDebtId: debt.id,
          movementId: newMovement.id,
          periodLabel,
          actualAmount: debt.amount,
        };
        await repo.saveLink(link);
      }
    }

    // Advance nextDueDate
    let nextDue = parseISO(debt.nextDueDate);
    while (nextDue <= today) {
      nextDue = advanceNextDueDate(nextDue, debt.frequency);
    }
    const updatedDebt: IRecurringDebt = {
      ...debt,
      nextDueDate: nextDue.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repo.update(updatedDebt);

    set((state) => ({
      recurringDebts: state.recurringDebts.map((d) =>
        d.id === updatedDebt.id ? updatedDebt : d
      ),
      pendingConfirmations: state.pendingConfirmations.filter((d) => d.id !== debt.id),
    }));
  },
}));
