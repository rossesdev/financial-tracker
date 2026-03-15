import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SQLiteMovementRepository } from '@/storage/repositories/sqlite/SQLiteMovementRepository';
import { IMovement, TKeyPeriodFilter } from '@/types/movements';
import { FilterState } from '@/types/filters';
import { useEntitiesStore } from './entitiesStore';
import { useBudgetsStore } from './budgetsStore';
import { useGoalsStore } from './goalsStore';

const movementsStorage = {
  getItem: async (_name: string) => {
    const repo = new SQLiteMovementRepository();
    const movements = await repo.getAll();
    return { state: { movements }, version: 0 };
  },
  setItem: async (_name: string, value: { state: { movements: IMovement[] }; version: number }) => {
    const repo = new SQLiteMovementRepository();
    const movements: IMovement[] = value.state.movements;
    await repo.deleteAll();
    for (const movement of movements) {
      await repo.save(movement);
    }
  },
  removeItem: async (_name: string) => {},
};

const defaultFilters: FilterState = {
  search: '',
  categories: [],
  entities: [],
  typeOfMovements: [],
  dateRange: undefined,
};

type MovementsState = {
  movements: IMovement[];
  isHydrated: boolean;
  keyPeriodFilter: TKeyPeriodFilter;
  filters: FilterState;
  addMovement: (movement: Omit<IMovement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeMovement: (id: string) => Promise<void>;
  changeKeyPeriodFilter: (filter: TKeyPeriodFilter) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearAllFilters: () => void;
};

export const useMovementsStore = create<MovementsState>()(
  persist(
    (set, get) => ({
      movements: [],
      isHydrated: false,
      keyPeriodFilter: 'today' as TKeyPeriodFilter,
      filters: defaultFilters,
      addMovement: (movement) => {
        const now = new Date().toISOString();
        const newMovement: IMovement = {
          ...movement,
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ movements: [newMovement, ...state.movements] }));
        useEntitiesStore.getState().recalcTotalsFromMovements(get().movements);
        // Trigger budget re-evaluation after every movement mutation
        useBudgetsStore.getState().evaluateAll();
      },
      removeMovement: async (id) => {
        // Check if the movement is linked to a goal contribution — warn user and clean up
        const goalContribution =
          await useGoalsStore.getState().getContributionByMovementId(id);
        if (goalContribution) {
          await useGoalsStore.getState().removeContributionByMovementId(id);
        }
        set((state) => ({ movements: state.movements.filter((m) => m.id !== id) }));
        useEntitiesStore.getState().recalcTotalsFromMovements(get().movements);
        // Trigger budget re-evaluation after every movement mutation
        useBudgetsStore.getState().evaluateAll();
      },
      changeKeyPeriodFilter: (filter) => set({ keyPeriodFilter: filter }),
      updateFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value } })),
      clearAllFilters: () => set({ filters: defaultFilters }),
    }),
    {
      name: 'movements',
      storage: movementsStorage as any,
      partialize: (state: MovementsState) => ({ movements: state.movements }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          useMovementsStore.setState({ isHydrated: true });
          useEntitiesStore.getState().recalcTotalsFromMovements(state.movements);
        }
      },
    }
  )
);
