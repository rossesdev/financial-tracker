import { useEntities } from "@/context/EntitiesContext";
import { loadMovements, saveMovements } from "@/storage/storage";
import { FilterState } from "@/types/filters";
import { IMovement, TKeyPeriodFilter } from "@/types/movements";
import { getLabelById } from "@/utils/getDataByType";
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type IMovementBase = Omit<IMovement, "id">;

type MovementsContextType = {
  movements: IMovement[];
  filteredMovements: IMovement[];
  keyPeriodFilter: "today" | "week" | "month";
  filters: FilterState;
  addMovement: (movement: IMovementBase) => void;
  removeMovement: (id: number) => void;
  changeKeyPeriodFilter: (filter: TKeyPeriodFilter) => void;
  updateFilter: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => void;
  clearAllFilters: () => void;
};

const MovementsContext = createContext<MovementsContextType | undefined>(
  undefined
);

export const MovementsProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [movements, setMovements] = useState<IMovement[]>([]);
  const [keyPeriodFilter, setKeyPeriodFilter] =
    useState<TKeyPeriodFilter>("today");

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    categories: [],
    entities: [],
    typeOfMovements: [],
    dateRange: undefined,
  });

  const { recalcTotalsFromMovements } = useEntities();

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      if (filters.search.length > 2) {
        const desc = movement.description?.toLowerCase() || "";
        const catLabel = getLabelById(
          movement.category,
          "categories"
        ).toLowerCase();
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch =
          catLabel.includes(searchTerm) || desc.includes(searchTerm);
        if (!matchesSearch) return false;
      }

      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(movement.category)
      ) {
        return false;
      }

      if (
        filters.entities.length > 0 &&
        !filters.entities.includes(movement.entity || "")
      ) {
        return false;
      }

      if (
        filters.typeOfMovements.length > 0 &&
        !filters.typeOfMovements.includes(movement.typeOfMovement)
      ) {
        return false;
      }

      if (filters.dateRange) {
        const movementDate = new Date(movement.date);
        const { startDate, endDate } = filters.dateRange;

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);

          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);

          if (movementDate < start || movementDate > end) return false;
        }
      }

      return true;
    });
  }, [movements, filters]);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: "",
      categories: [],
      entities: [],
      typeOfMovements: [],
      dateRange: undefined,
    });
  }, []);

  const fetchData = async () => {
    const data = await loadMovements();
    setMovements(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const sortedMovements = [...movements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    saveMovements(sortedMovements);

    // Recalculate entity totals from movements
    try {
      recalcTotalsFromMovements(movements as any);
    } catch (err) {
      // ignore if hook unavailable
    }
  }, [movements]);

  const addMovement = (movement: IMovementBase) => {
    setMovements((prev) => {
      let newMovement: IMovement;
      if (prev.length > 0) {
        const lastId = prev.reduce(
          (max: number, item: IMovement) => (item.id > max ? item.id : max),
          0
        );
        newMovement = { ...movement, id: lastId + 1 };
      } else {
        newMovement = { ...movement, id: 1 };
      }

      return [newMovement, ...prev];
    });
  };

  const removeMovement = (id: number) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  };

  const changeKeyPeriodFilter = (filter: TKeyPeriodFilter) => {
    setKeyPeriodFilter(filter);
  };

  return (
    <MovementsContext.Provider
      value={{
        movements,
        filteredMovements,
        keyPeriodFilter,
        filters,
        addMovement,
        removeMovement,
        changeKeyPeriodFilter,
        updateFilter,
        clearAllFilters,
      }}
    >
      {children}
    </MovementsContext.Provider>
  );
};

export const useMovements = () => {
  const context = useContext(MovementsContext);
  if (!context)
    throw new Error("useMovements must be used inside MovementsProvider");
  return context;
};
