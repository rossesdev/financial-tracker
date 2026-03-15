export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface IGoalContribution {
  id: string;
  goalId: string;
  movementId?: string;
  amount: number; // integer cents
  date: string; // ISO 8601
  note?: string;
}

export interface IGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number; // integer cents
  targetDate?: string; // ISO 8601
  entity?: string;
  category: string;
  status: GoalStatus;
  contributions: IGoalContribution[];
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// Derived — never stored in DB
export interface IGoalProgress {
  goal: IGoal;
  currentAmount: number; // sum of contributions
  progressPercentage: number; // 0..1 (may exceed 1 if overfunded)
  remainingAmount: number; // may be negative if overfunded
  isOverfunded: boolean;
  requiredMonthlySavings?: number; // only if targetDate is set
  projectedCompletionDate?: Date; // only if targetDate is set and progress > 0
  daysUntilDeadline?: number;
  isOverdue: boolean;
}
