export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';

export interface IRecurringDebt {
  id: string;
  name: string;
  amount: number; // integer cents
  category: string;
  entity?: string;
  frequency: RecurrenceFrequency;
  startDate: string; // ISO 8601
  nextDueDate: string; // ISO 8601
  endDate?: string;
  isActive: boolean;
  autoPost: boolean;
  estimatedAmount: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IRecurringMovementLink {
  recurringDebtId: string;
  movementId: string;
  periodLabel: string; // e.g. "2026-02"
  actualAmount: number;
}
