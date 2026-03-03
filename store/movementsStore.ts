import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadMovements, saveMovements } from '@/storage/storage';
import { IMovement, TKeyPeriodFilter } from '@/types/movements';
import { FilterState } from '@/types/filters';
import { useEntitiesStore } from './entitiesStore';

const movementsStorage = {
  getItem: async (_name: string) => {
    const movements = await loadMovements();
    return JSON.stringify({ state: { movements }, version: 0 });
  },
  setItem: async (_name: string, value: string) => {
    const parsed = JSON.parse(value);
    await saveMovements(parsed.state.movements);
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
  removeMovement: (id: string) => void;
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
      },
      removeMovement: (id) => {
        set((state) => ({ movements: state.movements.filter((m) => m.id !== id) }));
        useEntitiesStore.getState().recalcTotalsFromMovements(get().movements);
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
