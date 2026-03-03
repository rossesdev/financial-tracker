import { useMovementsStore } from '@/store/movementsStore';
import { getLabelById } from '@/utils/getDataByType';
import { FC, ReactNode, useMemo } from 'react';

export const useMovements = () => {
  const state = useMovementsStore();

  const filteredMovements = useMemo(() => {
    const { movements, filters } = state;
    return movements.filter((movement) => {
      if (filters.search.length > 2) {
        const desc = movement.description?.toLowerCase() || '';
        const catLabel = getLabelById(movement.category, 'categories').toLowerCase();
        const searchTerm = filters.search.toLowerCase();
        if (!catLabel.includes(searchTerm) && !desc.includes(searchTerm)) return false;
      }
      if (filters.categories.length > 0 && !filters.categories.includes(movement.category)) return false;
      if (filters.entities.length > 0 && !filters.entities.includes(movement.entity || '')) return false;
      if (filters.typeOfMovements.length > 0 && !filters.typeOfMovements.includes(movement.typeOfMovement)) return false;
      if (filters.dateRange) {
        const movementDate = new Date(movement.date);
        const { startDate, endDate } = filters.dateRange;
        if (startDate && endDate) {
          const start = new Date(startDate); start.setHours(0, 0, 0, 0);
          const end = new Date(endDate); end.setHours(23, 59, 59, 999);
          if (movementDate < start || movementDate > end) return false;
        }
      }
      return true;
    });
  }, [state.movements, state.filters]);

  return { ...state, filteredMovements };
};

// No-op provider — kept so any remaining imports of MovementsProvider don't break
export const MovementsProvider: FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;
