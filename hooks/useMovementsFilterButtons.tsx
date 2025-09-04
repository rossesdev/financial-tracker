import { IMovement } from "@/types/movements";
import { isSameDay, isSameMonth, isSameWeek } from "date-fns";
import { useCallback, useMemo, useRef } from "react";

type FilterKey = "today" | "week" | "month";

export default function useMovementDateFilter(movements: IMovement[]) {
  const currentDate = useRef(new Date()).current;

  const filterFunctions = useMemo(
    () => ({
      today: (date: Date) => isSameDay(date, currentDate),
      week: (date: Date) => isSameWeek(date, currentDate),
      month: (date: Date) => isSameMonth(date, currentDate),
    }),
    [currentDate]
  );

  const filterByPeriod = useCallback(
    (key: FilterKey) => {
      const filterFunction = filterFunctions[key];
      if (!filterFunction) return movements;

      return movements.filter((movement) =>
        filterFunction(new Date(movement.date))
      );
    },
    [movements, filterFunctions]
  );

  return { filterByPeriod };
}
