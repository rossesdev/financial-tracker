import { IMovement } from '@/types/movements';

export interface IMovementRepository {
  getAll(): Promise<IMovement[]>;
  getById(id: string): Promise<IMovement | null>;
  getByDateRange(start: Date, end: Date): Promise<IMovement[]>;
  getByCategory(categoryId: string): Promise<IMovement[]>;
  save(movement: IMovement): Promise<void>;
  update(movement: IMovement): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}
