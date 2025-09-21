import { Option } from "@/types/general";
import { useCallback, useMemo } from "react";

export const useSelection = (
  values: string[],
  options: Option[],
  maxSelections?: number
) => {
  const selectedLabels = useMemo(() => {
    return values
      .map((value) => {
        const found = options.find((opt) => opt.value === value);
        return found?.label ?? "";
      })
      .filter(Boolean);
  }, [options, values]);

  const canSelectMore = useCallback(
    (currentCount: number) => {
      return !maxSelections || currentCount < maxSelections;
    },
    [maxSelections]
  );

  const isSelectionLimitReached = useMemo(() => {
    return maxSelections ? values.length >= maxSelections : false;
  }, [maxSelections, values.length]);

  return {
    selectedLabels,
    canSelectMore,
    isSelectionLimitReached,
  };
};
