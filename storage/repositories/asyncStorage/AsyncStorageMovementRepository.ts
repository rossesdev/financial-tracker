import { IMovement } from '@/types/movements';
import { loadMovements, saveMovements } from '@/storage/storage';
import { IMovementRepository } from '../interfaces/IMovementRepository';

export class AsyncStorageMovementRepository implements IMovementRepository {
  async getAll(): Promise<IMovement[]> {
    return loadMovements();
  }

  async getById(id: string): Promise<IMovement | null> {
    const all = await loadMovements();
    return all.find((m) => m.id === id) ?? null;
  }

  async getByDateRange(start: Date, end: Date): Promise<IMovement[]> {
    const all = await loadMovements();
    return all.filter((m) => {
      const d = new Date(m.date);
      return d >= start && d <= end;
    });
  }

  async getByCategory(categoryId: string): Promise<IMovement[]> {
    const all = await loadMovements();
    return all.filter((m) => m.category === categoryId);
  }

  async save(movement: IMovement): Promise<void> {
    const all = await loadMovements();
    const exists = all.findIndex((m) => m.id === movement.id);
    if (exists >= 0) {
      all[exists] = movement;
    } else {
      all.unshift(movement);
    }
    await saveMovements(all);
  }

  async update(movement: IMovement): Promise<void> {
    const all = await loadMovements();
    const idx = all.findIndex((m) => m.id === movement.id);
    if (idx >= 0) {
      all[idx] = { ...movement, updatedAt: new Date().toISOString() };
      await saveMovements(all);
    }
  }

  async delete(id: string): Promise<void> {
    const all = await loadMovements();
    await saveMovements(all.filter((m) => m.id !== id));
  }

  async deleteAll(): Promise<void> {
    await saveMovements([]);
  }
}
