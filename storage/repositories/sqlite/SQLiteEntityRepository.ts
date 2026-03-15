import { IEntity } from '@/types/entities';
import { IEntityRepository } from '../interfaces/IEntityRepository';
import { getDatabaseInstance } from '@/storage/database';

interface EntityRow {
  id: string;
  name: string;
  image: string;
  created_at: string;
  updated_at: string;
}

function rowToEntity(row: EntityRow): IEntity {
  return {
    id: Number(row.id),
    name: row.name,
    image: row.image,
  };
}

export class SQLiteEntityRepository implements IEntityRepository {
  async getAll(): Promise<IEntity[]> {
    const db = await getDatabaseInstance();
    const rows = await db.getAllAsync<EntityRow>(
      'SELECT * FROM entities ORDER BY id ASC'
    );
    return rows.map(rowToEntity);
  }

  async getById(id: number): Promise<IEntity | null> {
    const db = await getDatabaseInstance();
    const row = await db.getFirstAsync<EntityRow>(
      'SELECT * FROM entities WHERE id = ?',
      [String(id)]
    );
    return row ? rowToEntity(row) : null;
  }

  async save(entity: IEntity): Promise<void> {
    const db = await getDatabaseInstance();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO entities (id, name, image, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [String(entity.id), entity.name, entity.image, now, now]
    );
  }

  async update(entity: IEntity): Promise<void> {
    await this.save(entity);
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabaseInstance();
    await db.runAsync('DELETE FROM entities WHERE id = ?', [String(id)]);
  }

  async saveAll(entities: IEntity[]): Promise<void> {
    for (const entity of entities) {
      await this.save(entity);
    }
  }
}
