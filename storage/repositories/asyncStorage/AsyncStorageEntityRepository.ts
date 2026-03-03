import { IEntity } from '@/types/entities';
import { loadEntities, saveEntities } from '@/storage/storage';
import { IEntityRepository } from '../interfaces/IEntityRepository';

export class AsyncStorageEntityRepository implements IEntityRepository {
  async getAll(): Promise<IEntity[]> {
    return loadEntities();
  }

  async getById(id: number): Promise<IEntity | null> {
    const all = await loadEntities();
    return all.find((e) => e.id === id) ?? null;
  }

  async save(entity: IEntity): Promise<void> {
    const all = await loadEntities();
    const exists = all.findIndex((e) => e.id === entity.id);
    if (exists >= 0) {
      all[exists] = entity;
    } else {
      all.push(entity);
    }
    await saveEntities(all);
  }

  async update(entity: IEntity): Promise<void> {
    await this.save(entity);
  }

  async delete(id: number): Promise<void> {
    const all = await loadEntities();
    await saveEntities(all.filter((e) => e.id !== id));
  }

  async saveAll(entities: IEntity[]): Promise<void> {
    await saveEntities(entities);
  }
}
