import { IMovement } from '@/types/movements';
import { IMovementRepository } from '../interfaces/IMovementRepository';
import { getDatabaseInstance } from '@/storage/database';

interface MovementRow {
  id: string;
  description: string;
  amount: number;
  type: string;
  category_id: string;
  entity_id: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

function rowToMovement(row: MovementRow): IMovement {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    typeOfMovement: row.type,
    category: row.category_id,
    entity: row.entity_id ?? undefined,
    date: new Date(row.date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteMovementRepository implements IMovementRepository {
  async getAll(): Promise<IMovement[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<MovementRow>(
      'SELECT * FROM movements ORDER BY date DESC'
    );
    return rows.map(rowToMovement);
  }

  async getById(id: string): Promise<IMovement | null> {
    const db = await getDatabaseInstance();
    const row = await db.getFirstAsync<MovementRow>(
      'SELECT * FROM movements WHERE id = ?',
      [id]
    );
    return row ? rowToMovement(row) : null;
  }

  async getByDateRange(start: Date, end: Date): Promise<IMovement[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<MovementRow>(
      'SELECT * FROM movements WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [start.toISOString(), end.toISOString()]
    );
    return rows.map(rowToMovement);
  }

  async getByCategory(categoryId: string): Promise<IMovement[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<MovementRow>(
      'SELECT * FROM movements WHERE category_id = ? ORDER BY date DESC',
      [categoryId]
    );
    return rows.map(rowToMovement);
  }

  async save(movement: IMovement): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync(
      `INSERT OR REPLACE INTO movements
        (id, description, amount, type, category_id, entity_id, date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movement.id,
        movement.description,
        movement.amount,
        movement.typeOfMovement,
        movement.category,
        movement.entity ?? null,
        movement.date instanceof Date
          ? movement.date.toISOString()
          : movement.date,
        movement.createdAt,
        movement.updatedAt,
      ]
    );
  }

  async update(movement: IMovement): Promise<void> {
    const db = await getDatabaseInstance();
    const updatedAt = new Date().toISOString();
    await db.runAsync(
      `UPDATE movements
         SET description = ?, amount = ?, type = ?, category_id = ?,
             entity_id = ?, date = ?, updated_at = ?
       WHERE id = ?`,
      [
        movement.description,
        movement.amount,
        movement.typeOfMovement,
        movement.category,
        movement.entity ?? null,
        movement.date instanceof Date
          ? movement.date.toISOString()
          : movement.date,
        updatedAt,
        movement.id,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM movements WHERE id = ?', [id]);
  }

  async deleteAll(): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM movements');
  }
}
