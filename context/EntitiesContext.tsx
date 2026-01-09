import entitiesMock from "@/mocks/entities.json";
import { loadEntities, saveEntities } from "@/storage/storage";
import { IEntity } from "@/types/entities";
import { IMovement } from "@/types/movements";
import { addPoints } from "@/utils/current";
import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type EntitiesContextType = {
  entities: IEntity[];
  setEntities: (entities: IEntity[]) => void;
  recalcTotalsFromMovements: (movements: IMovement[]) => void;
};

const EntitiesContext = createContext<EntitiesContextType | undefined>(
  undefined
);

export const EntitiesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [entities, setEntitiesState] = useState<IEntity[]>([]);

  const setEntities = useCallback((list: IEntity[]) => {
    setEntitiesState(list);
    saveEntities(list);
  }, []);

  const recalcTotalsFromMovements = useCallback(
    (movements: IMovement[]) => {
      const totalsMap: Record<string, number> = {};

      // Initialize totals with zero for existing entities
      const currentEntities =
        entities.length > 0 ? entities : (entitiesMock as IEntity[]);
      currentEntities.forEach((e) => {
        totalsMap[e.id.toString()] = 0;
      });

      movements.forEach((m) => {
        if (!m.entity) return;
        const key = m.entity.toString();
        let raw = String(m.amount || "")
          .replace(/\./g, "")
          .replace(/\s/g, "");
        if (raw === "") raw = "0";
        let value = Number(raw);
        // If typeOfMovement indicates expense (value '2'), subtract
        if (m.typeOfMovement === "2") value = -Math.abs(value);

        if (!totalsMap[key]) totalsMap[key] = 0;
        totalsMap[key] += value;
      });

      const newEntities = currentEntities.map((e) => {
        const total = totalsMap[e.id.toString()] || 0;
        return {
          ...e,
          total_amount: addPoints(String(total)),
        } as IEntity;
      });

      setEntitiesState(newEntities);
      saveEntities(newEntities);
    },
    [entities]
  );

  useEffect(() => {
    const init = async () => {
      const data = await loadEntities();
      setEntitiesState((prev) =>
        prev && prev.length > 0
          ? prev
          : data && data.length > 0
          ? (data as IEntity[])
          : (entitiesMock as IEntity[])
      );
    };
    init();
  }, []);

  return (
    <EntitiesContext.Provider
      value={{ entities, setEntities, recalcTotalsFromMovements }}
    >
      {children}
    </EntitiesContext.Provider>
  );
};

export const useEntities = () => {
  const ctx = useContext(EntitiesContext);
  if (!ctx) throw new Error("useEntities must be used inside EntitiesProvider");
  return ctx;
};
