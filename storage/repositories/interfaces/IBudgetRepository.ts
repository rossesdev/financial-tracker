import { IBudget, IBudgetAlert } from '@/features/budgets/types';

export interface IBudgetRepository {
  getAll(): Promise<IBudget[]>;
  getActive(): Promise<IBudget[]>;
  save(budget: IBudget): Promise<void>;
  update(budget: IBudget): Promise<void>;
  delete(id: string): Promise<void>;
  getAlerts(budgetId: string): Promise<IBudgetAlert[]>;
  getAllAlerts(): Promise<IBudgetAlert[]>;
  saveAlert(alert: IBudgetAlert): Promise<void>;
  dismissAlert(alertId: string): Promise<void>;
  deleteAlertsByBudget(budgetId: string): Promise<void>;
}
