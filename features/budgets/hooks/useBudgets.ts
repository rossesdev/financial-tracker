import { useEffect } from 'react';
import { useBudgetsStore } from '@/store/budgetsStore';
import { IBudgetStatus } from '../types';

/**
 * Loads budgets from the store, computes IBudgetStatus for each active budget,
 * and keeps statuses up to date whenever movements or budgets change.
 */
export function useBudgets(): {
  budgetStatuses: IBudgetStatus[];
  isHydrated: boolean;
} {
  const { budgetStatuses, isHydrated, hydrate, evaluateAll } = useBudgetsStore();

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  // Re-evaluate whenever movements change (movement store subscription)
  useEffect(() => {
    if (isHydrated) {
      evaluateAll();
    }
  }, [isHydrated, evaluateAll]);

  return { budgetStatuses, isHydrated };
}
