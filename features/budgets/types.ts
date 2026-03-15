export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type AlertThreshold = 0.5 | 0.75 | 0.8 | 0.9 | 1.0;

export interface IBudget {
  id: string;
  name: string;
  categoryIds: string[];
  entityIds?: string[];
  limitAmount: number; // integer cents
  period: BudgetPeriod;
  alertThresholds: AlertThreshold[];
  isActive: boolean;
  rollover: boolean;
  rolloverCap?: number; // integer cents
  createdAt: string;
  updatedAt: string;
}

export interface IBudgetAlert {
  id: string;
  budgetId: string;
  threshold: AlertThreshold;
  periodLabel: string;
  triggeredAt: string;
  actualAmount: number; // integer cents
  budgetAmount: number; // integer cents
  dismissed: boolean;
}

// Derived — never stored in DB
export interface IBudgetStatus {
  budget: IBudget;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  effectiveLimitAmount: number; // limitAmount + rolloverAmount (capped)
  rolloverAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercentage: number; // 0..1
  status: 'ok' | 'warning' | 'exceeded';
  pendingAlerts: AlertThreshold[];
  firedAlerts: IBudgetAlert[];
}
