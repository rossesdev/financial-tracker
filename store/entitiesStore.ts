import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SQLiteEntityRepository } from '@/storage/repositories/sqlite/SQLiteEntityRepository';
import { IEntity } from '@/types/entities';
import { IMovement } from '@/types/movements';
import entitiesConfig from '@/config/entities.json';

const entitiesStorage = {
  getItem: async (_name: string) => {
    const repo = new SQLiteEntityRepository();
    const data = await repo.getAll();
    const entities: IEntity[] =
      data.length > 0
        ? data
        : (entitiesConfig as any[]).map(
            ({ total_amount, ...rest }: any) => rest as IEntity
          );
    return { state: { entities }, version: 0 };
  },
  setItem: async (_name: string, value: { state: { entities: IEntity[] }; version: number }) => {
    const repo = new SQLiteEntityRepository();
    await repo.saveAll(value.state.entities);
  },
  removeItem: async (_name: string) => {},
};

type EntitiesState = {
  entities: IEntity[];
  entityTotals: Record<string, number>;
  setEntities: (entities: IEntity[]) => void;
  recalcTotalsFromMovements: (movements: IMovement[]) => void;
};

export const useEntitiesStore = create<EntitiesState>()(
  persist(
    (set, get) => ({
      entities: [],
      entityTotals: {},
      setEntities: (entities) => {
        set({ entities });
        const repo = new SQLiteEntityRepository();
        repo.saveAll(entities).catch(console.error);
      },
      recalcTotalsFromMovements: (movements) => {
        const current =
          get().entities.length > 0
            ? get().entities
            : (entitiesConfig as any[]).map(
                ({ total_amount, ...rest }: any) => rest as IEntity
              );
        const totalsMap: Record<string, number> = {};
        current.forEach((e) => {
          totalsMap[e.id.toString()] = 0;
        });
        movements.forEach((m) => {
          if (!m.entity) return;
          const key = m.entity.toString();
          const delta =
            m.typeOfMovement === '2' ? -Math.abs(m.amount) : m.amount;
          totalsMap[key] = (totalsMap[key] ?? 0) + delta;
        });
        set({ entityTotals: totalsMap });
      },
    }),
    {
      name: 'entities',
      storage: entitiesStorage as any,
      partialize: (state: EntitiesState) => ({ entities: state.entities }),
    }
  )
);
