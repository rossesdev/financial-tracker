import { loadMovements, saveMovements } from "@/storage/storage";
import { IMovement, TKeyPeriodFilter } from "@/types/movements";
import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type IMovementBase = Omit<IMovement, "id">;

type MovementsContextType = {
  movements: IMovement[];
  keyPeriodFilter: "today" | "week" | "month";
  addMovement: (movement: IMovementBase) => void;
  removeMovement: (id: number) => void;
  changeKeyPeriodFilter: (filter: TKeyPeriodFilter) => void;
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
  }, [movements]);

  const addMovement = (movement: IMovementBase) => {
    let newMovement: IMovement;

    if (movements.length > 0) {
      const lastId = movements.reduce(
        (max: number, item: IMovement) => (item.id > max ? item.id : max),
        0
      );

      newMovement = { ...movement, id: lastId + 1 };
    } else {
      newMovement = { ...movement, id: 1 };
    }

    setMovements((prev) => [...prev, newMovement]);
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
        keyPeriodFilter,
        addMovement,
        removeMovement,
        changeKeyPeriodFilter,
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
