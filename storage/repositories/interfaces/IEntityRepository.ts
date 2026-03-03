import { IEntity } from '@/types/entities';

export interface IEntityRepository {
  getAll(): Promise<IEntity[]>;
  getById(id: number): Promise<IEntity | null>;
  save(entity: IEntity): Promise<void>;
  update(entity: IEntity): Promise<void>;
  delete(id: number): Promise<void>;
  saveAll(entities: IEntity[]): Promise<void>;
}
