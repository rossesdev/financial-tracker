import { useEffect } from 'react';
import { useGoalsStore } from '@/store/goalsStore';
import { IGoalProgress } from '../types';

/**
 * Loads goals from the store and returns derived IGoalProgress for each goal.
 */
export function useGoals(): {
  goalProgresses: IGoalProgress[];
  isHydrated: boolean;
} {
  const { goalProgresses, isHydrated, hydrate } = useGoalsStore();

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  return { goalProgresses, isHydrated };
}
