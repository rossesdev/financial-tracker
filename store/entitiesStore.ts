import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadEntities, saveEntities } from '@/storage/storage';
import { IEntity } from '@/types/entities';
import { IMovement } from '@/types/movements';
import entitiesConfig from '@/config/entities.json';

const entitiesStorage = {
  getItem: async (_name: string) => {
    const data = await loadEntities();
    const entities: IEntity[] = data.length > 0
      ? data
      : (entitiesConfig as any[]).map(({ total_amount, ...rest }: any) => rest as IEntity);
    return JSON.stringify({ state: { entities }, version: 0 });
  },
  setItem: async (_name: string, value: string) => {
    const parsed = JSON.parse(value);
    await saveEntities(parsed.state.entities);
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
        saveEntities(entities).catch(console.error);
      },
      recalcTotalsFromMovements: (movements) => {
        const current = get().entities.length > 0
          ? get().entities
          : (entitiesConfig as any[]).map(({ total_amount, ...rest }: any) => rest as IEntity);
        const totalsMap: Record<string, number> = {};
        current.forEach((e) => { totalsMap[e.id.toString()] = 0; });
        movements.forEach((m) => {
          if (!m.entity) return;
          const key = m.entity.toString();
          const delta = m.typeOfMovement === '2' ? -Math.abs(m.amount) : m.amount;
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
