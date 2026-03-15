import { IRecurringDebt, IRecurringMovementLink } from '@/features/recurringDebts/types';
import { IRecurringDebtRepository } from '../interfaces/IRecurringDebtRepository';
import { getDatabaseInstance } from '@/storage/database';

interface RecurringDebtRow {
  id: string;
  name: string;
  amount: number;
  category: string;
  entity_id: string | null;
  frequency: string;
  start_date: string;
  next_due_date: string;
  end_date: string | null;
  is_active: number;
  auto_post: number;
  estimated_amount: number;
  created_at: string;
  updated_at: string;
}

interface RecurringMovementLinkRow {
  recurring_debt_id: string;
  movement_id: string;
  period_label: string;
  actual_amount: number;
}

function rowToDebt(row: RecurringDebtRow): IRecurringDebt {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    category: row.category,
    entity: row.entity_id ?? undefined,
    frequency: row.frequency as IRecurringDebt['frequency'],
    startDate: row.start_date,
    nextDueDate: row.next_due_date,
    endDate: row.end_date ?? undefined,
    isActive: row.is_active === 1,
    autoPost: row.auto_post === 1,
    estimatedAmount: row.estimated_amount === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLink(row: RecurringMovementLinkRow): IRecurringMovementLink {
  return {
    recurringDebtId: row.recurring_debt_id,
    movementId: row.movement_id,
    periodLabel: row.period_label,
    actualAmount: row.actual_amount,
  };
}

export class SQLiteRecurringDebtRepository implements IRecurringDebtRepository {
  async getAll(): Promise<IRecurringDebt[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<RecurringDebtRow>(
      'SELECT * FROM recurring_debts ORDER BY name ASC'
    );
    return rows.map(rowToDebt);
  }

  async getActive(): Promise<IRecurringDebt[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<RecurringDebtRow>(
      'SELECT * FROM recurring_debts WHERE is_active = 1 ORDER BY next_due_date ASC'
    );
    return rows.map(rowToDebt);
  }

  async save(debt: IRecurringDebt): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `INSERT OR REPLACE INTO recurring_debts
        (id, name, amount, category, entity_id, frequency, start_date, next_due_date,
         end_date, is_active, auto_post, estimated_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        debt.id,
        debt.name,
        debt.amount,
        debt.category,
        debt.entity ?? null,
        debt.frequency,
        debt.startDate,
        debt.nextDueDate,
        debt.endDate ?? null,
        debt.isActive ? 1 : 0,
        debt.autoPost ? 1 : 0,
        debt.estimatedAmount ? 1 : 0,
        debt.createdAt,
        debt.updatedAt,
      ]
    );
  }

  async update(debt: IRecurringDebt): Promise<void> {
    const db = await getDatabaseInstance();
    const updatedAt = new Date().toISOString();
    await db.runAsync(
      `UPDATE recurring_debts
         SET name = ?, amount = ?, category = ?, entity_id = ?, frequency = ?,
             start_date = ?, next_due_date = ?, end_date = ?, is_active = ?,
             auto_post = ?, estimated_amount = ?, updated_at = ?
       WHERE id = ?`,
      [
        debt.name,
        debt.amount,
        debt.category,
        debt.entity ?? null,
        debt.frequency,
        debt.startDate,
        debt.nextDueDate,
        debt.endDate ?? null,
        debt.isActive ? 1 : 0,
        debt.autoPost ? 1 : 0,
        debt.estimatedAmount ? 1 : 0,
        updatedAt,
        debt.id,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM recurring_debts WHERE id = ?', [id]);
  }

  async getLinks(recurringDebtId: string): Promise<IRecurringMovementLink[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<RecurringMovementLinkRow>(
      'SELECT * FROM recurring_movement_links WHERE recurring_debt_id = ?',
      [recurringDebtId]
    );
    return rows.map(rowToLink);
  }

  async getAllLinks(): Promise<IRecurringMovementLink[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<RecurringMovementLinkRow>(
      'SELECT * FROM recurring_movement_links'
    );
    return rows.map(rowToLink);
  }

  async saveLink(link: IRecurringMovementLink): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `INSERT OR REPLACE INTO recurring_movement_links
        (recurring_debt_id, movement_id, period_label, actual_amount)
       VALUES (?, ?, ?, ?)`,
      [link.recurringDebtId, link.movementId, link.periodLabel, link.actualAmount]
    );
  }

  async deleteLink(recurringDebtId: string, periodLabel: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      'DELETE FROM recurring_movement_links WHERE recurring_debt_id = ? AND period_label = ?',
      [recurringDebtId, periodLabel]
    );
  }
}
