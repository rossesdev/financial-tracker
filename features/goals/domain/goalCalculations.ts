import {
  differenceInDays,
  differenceInMonths,
  parseISO,
  addMonths,
  isBefore,
} from 'date-fns';
import { IGoal, IGoalProgress } from '../types';

/**
 * Computes derived progress metrics for a goal.
 * currentAmount is always derived from contributions sum — never stored.
 *
 * @param goal - The goal with its contributions
 * @param today - Reference date (injectable for testability)
 */
export function computeGoalProgress(goal: IGoal, today: Date): IGoalProgress {
  const currentAmount = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
  const remainingAmount = goal.targetAmount - currentAmount;
  const isOverfunded = currentAmount > goal.targetAmount;
  const progressPercentage =
    goal.targetAmount > 0 ? currentAmount / goal.targetAmount : 0;

  let daysUntilDeadline: number | undefined;
  let isOverdue = false;
  let requiredMonthlySavings: number | undefined;
  let projectedCompletionDate: Date | undefined;

  if (goal.targetDate) {
    const deadline = parseISO(goal.targetDate);
    daysUntilDeadline = differenceInDays(deadline, today);
    isOverdue = isBefore(deadline, today) && !isOverfunded;

    if (!isOverdue && remainingAmount > 0) {
      // Months remaining (minimum 1 to avoid division by zero)
      const monthsRemaining = Math.max(1, differenceInMonths(deadline, today));
      requiredMonthlySavings = Math.ceil(remainingAmount / monthsRemaining);
    }

    if (currentAmount > 0 && remainingAmount > 0) {
      // Project completion date based on current monthly savings rate
      const monthsElapsed = Math.max(1, differenceInMonths(today, parseISO(goal.createdAt)));
      const avgMonthlySavings = currentAmount / monthsElapsed;
      if (avgMonthlySavings > 0) {
        const monthsToComplete = Math.ceil(remainingAmount / avgMonthlySavings);
        projectedCompletionDate = addMonths(today, monthsToComplete);
      }
    }
  }

  return {
    goal,
    currentAmount,
    progressPercentage,
    remainingAmount,
    isOverfunded,
    requiredMonthlySavings,
    projectedCompletionDate,
    daysUntilDeadline,
    isOverdue,
  };
}

/**
 * Returns true if the goal should be auto-completed (current >= target and goal is active).
 */
export function shouldAutoComplete(goal: IGoal): boolean {
  if (goal.status !== 'active') return false;
  const currentAmount = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
  return currentAmount >= goal.targetAmount;
}
