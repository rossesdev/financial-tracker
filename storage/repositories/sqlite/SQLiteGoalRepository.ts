import { IGoal, IGoalContribution, GoalStatus } from '@/features/goals/types';
import { IGoalRepository } from '../interfaces/IGoalRepository';
import { getDatabaseInstance } from '@/storage/database';

interface GoalRow {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  target_date: string | null;
  entity_id: string | null;
  category: string;
  status: string;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface GoalContributionRow {
  id: string;
  goal_id: string;
  movement_id: string | null;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

function rowToContribution(row: GoalContributionRow): IGoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    movementId: row.movement_id ?? undefined,
    amount: row.amount,
    date: row.date,
    note: row.note ?? undefined,
  };
}

async function loadContributions(
  db: Awaited<ReturnType<typeof getDatabaseInstance>>,
  goalId: string
): Promise<IGoalContribution[]> {
  const rows = await db.getAllAsync<GoalContributionRow>(
    'SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY date ASC',
    [goalId]
  );
  return rows.map(rowToContribution);
}

async function rowToGoal(
  row: GoalRow,
  db: Awaited<ReturnType<typeof getDatabaseInstance>>
): Promise<IGoal> {
  const contributions = await loadContributions(db, row.id);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    targetAmount: row.target_amount,
    targetDate: row.target_date ?? undefined,
    entity: row.entity_id ?? undefined,
    category: row.category,
    status: row.status as GoalStatus,
    contributions,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteGoalRepository implements IGoalRepository {
  async getAll(): Promise<IGoal[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<GoalRow>(
      'SELECT * FROM goals ORDER BY created_at DESC'
    );
    return Promise.all(rows.map((row) => rowToGoal(row, db)));
  }

  async getByStatus(status: GoalStatus): Promise<IGoal[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<GoalRow>(
      'SELECT * FROM goals WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
    return Promise.all(rows.map((row) => rowToGoal(row, db)));
  }

  async save(goal: IGoal): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `INSERT OR REPLACE INTO goals
        (id, name, description, target_amount, target_date, entity_id,
         category, status, icon, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        goal.id,
        goal.name,
        goal.description ?? null,
        goal.targetAmount,
        goal.targetDate ?? null,
        goal.entity ?? null,
        goal.category,
        goal.status,
        goal.icon ?? null,
        goal.color ?? null,
        goal.createdAt,
        goal.updatedAt,
      ]
    );
    // Save contributions
    for (const c of goal.contributions) {
      await this.addContribution(c);
    }
  }

  async update(goal: IGoal): Promise<void> {
    const db = await getDatabaseInstance();
    const updatedAt = new Date().toISOString();
    await db.runAsync(
      `UPDATE goals
         SET name = ?, description = ?, target_amount = ?, target_date = ?,
             entity_id = ?, category = ?, status = ?, icon = ?, color = ?, updated_at = ?
       WHERE id = ?`,
      [
        goal.name,
        goal.description ?? null,
        goal.targetAmount,
        goal.targetDate ?? null,
        goal.entity ?? null,
        goal.category,
        goal.status,
        goal.icon ?? null,
        goal.color ?? null,
        updatedAt,
        goal.id,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
  }

  async addContribution(contribution: IGoalContribution): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `INSERT OR REPLACE INTO goal_contributions
        (id, goal_id, movement_id, amount, date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        contribution.id,
        contribution.goalId,
        contribution.movementId ?? null,
        contribution.amount,
        contribution.date,
        contribution.note ?? null,
        new Date().toISOString(),
      ]
    );
  }

  async updateContribution(contribution: IGoalContribution): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `UPDATE goal_contributions
         SET amount = ?, date = ?, note = ?
       WHERE id = ?`,
      [contribution.amount, contribution.date, contribution.note ?? null, contribution.id]
    );
  }

  async deleteContribution(id: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM goal_contributions WHERE id = ?', [id]);
  }

  async getContributionByMovementId(movementId: string): Promise<IGoalContribution | null> {
    const db = await getDatabaseInstance();
    const row = await db.getFirstAsync<GoalContributionRow>(
      'SELECT * FROM goal_contributions WHERE movement_id = ?',
      [movementId]
    );
    return row ? rowToContribution(row) : null;
  }
}
