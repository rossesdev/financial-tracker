import { IBudget, IBudgetAlert, AlertThreshold, BudgetPeriod } from '@/features/budgets/types';
import { IBudgetRepository } from '../interfaces/IBudgetRepository';
import { getDatabaseInstance } from '@/storage/database';

interface BudgetRow {
  id: string;
  name: string;
  limit_amount: number;
  period: string;
  rollover: number;
  rollover_cap: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface BudgetAlertRow {
  id: string;
  budget_id: string;
  threshold: number;
  period_label: string;
  triggered_at: string;
  actual_amount: number;
  budget_amount: number;
  dismissed: number;
}

async function loadBudgetRelations(
  db: Awaited<ReturnType<typeof getDatabaseInstance>>,
  budgetId: string
): Promise<{ categoryIds: string[]; entityIds: string[]; alertThresholds: AlertThreshold[] }> {
  const catRows = await db.getAllAsync<{ category_id: string }>(
    'SELECT category_id FROM budget_categories WHERE budget_id = ?',
    [budgetId]
  );
  const entRows = await db.getAllAsync<{ entity_id: string }>(
    'SELECT entity_id FROM budget_entities WHERE budget_id = ?',
    [budgetId]
  );
  const thresholdRows = await db.getAllAsync<{ threshold: number }>(
    'SELECT threshold FROM budget_alert_thresholds WHERE budget_id = ?',
    [budgetId]
  );
  return {
    categoryIds: catRows.map((r) => r.category_id),
    entityIds: entRows.map((r) => r.entity_id),
    alertThresholds: thresholdRows.map((r) => r.threshold as AlertThreshold),
  };
}

async function rowToBudget(
  row: BudgetRow,
  db: Awaited<ReturnType<typeof getDatabaseInstance>>
): Promise<IBudget> {
  const { categoryIds, entityIds, alertThresholds } = await loadBudgetRelations(db, row.id);
  return {
    id: row.id,
    name: row.name,
    categoryIds,
    entityIds: entityIds.length > 0 ? entityIds : undefined,
    limitAmount: row.limit_amount,
    period: row.period as BudgetPeriod,
    alertThresholds,
    isActive: row.is_active === 1,
    rollover: row.rollover === 1,
    rolloverCap: row.rollover_cap ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToAlert(row: BudgetAlertRow): IBudgetAlert {
  return {
    id: row.id,
    budgetId: row.budget_id,
    threshold: row.threshold as AlertThreshold,
    periodLabel: row.period_label,
    triggeredAt: row.triggered_at,
    actualAmount: row.actual_amount,
    budgetAmount: row.budget_amount,
    dismissed: row.dismissed === 1,
  };
}

async function saveBudgetRelations(
  db: Awaited<ReturnType<typeof getDatabaseInstance>>,
  budget: IBudget
): Promise<void> {
  // Delete existing relations
  await db.runAsync('DELETE FROM budget_categories WHERE budget_id = ?', [budget.id]);
  await db.runAsync('DELETE FROM budget_entities WHERE budget_id = ?', [budget.id]);
  await db.runAsync('DELETE FROM budget_alert_thresholds WHERE budget_id = ?', [budget.id]);

  // Re-insert categories
  for (const catId of budget.categoryIds) {
    await db.runAsync(
      'INSERT INTO budget_categories (budget_id, category_id) VALUES (?, ?)',
      [budget.id, catId]
    );
  }

  // Re-insert entities (if any)
  if (budget.entityIds) {
    for (const entId of budget.entityIds) {
      await db.runAsync(
        'INSERT INTO budget_entities (budget_id, entity_id) VALUES (?, ?)',
        [budget.id, entId]
      );
    }
  }

  // Re-insert thresholds
  for (const threshold of budget.alertThresholds) {
    await db.runAsync(
      'INSERT INTO budget_alert_thresholds (budget_id, threshold) VALUES (?, ?)',
      [budget.id, threshold]
    );
  }
}

export class SQLiteBudgetRepository implements IBudgetRepository {
  async getAll(): Promise<IBudget[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<BudgetRow>(
      'SELECT * FROM budgets ORDER BY name ASC'
    );
    return Promise.all(rows.map((row) => rowToBudget(row, db)));
  }

  async getActive(): Promise<IBudget[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<BudgetRow>(
      'SELECT * FROM budgets WHERE is_active = 1 ORDER BY name ASC'
    );
    return Promise.all(rows.map((row) => rowToBudget(row, db)));
  }

  async save(budget: IBudget): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `INSERT OR REPLACE INTO budgets
        (id, name, limit_amount, period, rollover, rollover_cap, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.id,
        budget.name,
        budget.limitAmount,
        budget.period,
        budget.rollover ? 1 : 0,
        budget.rolloverCap ?? null,
        budget.isActive ? 1 : 0,
        budget.createdAt,
        budget.updatedAt,
      ]
    );
    await saveBudgetRelations(db, budget);
  }

  async update(budget: IBudget): Promise<void> {
    const db = await getDatabaseInstance();
    const updatedAt = new Date().toISOString();
    await db.runAsync(
      `UPDATE budgets
         SET name = ?, limit_amount = ?, period = ?, rollover = ?,
             rollover_cap = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [
        budget.name,
        budget.limitAmount,
        budget.period,
        budget.rollover ? 1 : 0,
        budget.rolloverCap ?? null,
        budget.isActive ? 1 : 0,
        updatedAt,
        budget.id,
      ]
    );
    await saveBudgetRelations(db, budget);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
  }

  async getAlerts(budgetId: string): Promise<IBudgetAlert[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<BudgetAlertRow>(
      'SELECT * FROM budget_alerts WHERE budget_id = ? ORDER BY triggered_at DESC',
      [budgetId]
    );
    return rows.map(rowToAlert);
  }

  async getAllAlerts(): Promise<IBudgetAlert[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<BudgetAlertRow>(
      'SELECT * FROM budget_alerts ORDER BY triggered_at DESC'
    );
    return rows.map(rowToAlert);
  }

  async saveAlert(alert: IBudgetAlert): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `INSERT OR REPLACE INTO budget_alerts
        (id, budget_id, threshold, period_label, triggered_at, actual_amount, budget_amount, dismissed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alert.id,
        alert.budgetId,
        alert.threshold,
        alert.periodLabel,
        alert.triggeredAt,
        alert.actualAmount,
        alert.budgetAmount,
        alert.dismissed ? 1 : 0,
      ]
    );
  }

  async dismissAlert(alertId: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      'UPDATE budget_alerts SET dismissed = 1 WHERE id = ?',
      [alertId]
    );
  }

  async deleteAlertsByBudget(budgetId: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM budget_alerts WHERE budget_id = ?', [budgetId]);
  }
}
