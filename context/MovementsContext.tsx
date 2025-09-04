import { loadMovements, saveMovements } from "@/storage/storage";
import { IMovement } from "@/types/movements";
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
  addMovement: (movement: IMovementBase) => void;
  removeMovement: (id: number) => void;
};

const MovementsContext = createContext<MovementsContextType | undefined>(
  undefined
);

export const MovementsProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [movements, setMovements] = useState<IMovement[]>([]);

  const fetchData = async () => {
    const data = await loadMovements();
    setMovements(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    saveMovements(movements);
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

  return (
    <MovementsContext.Provider
      value={{ movements, addMovement, removeMovement }}
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
