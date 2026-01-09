import { BalanceDisplay } from "@/components/BalanceDisplay";
import Divider from "@/components/Divider";
import MovementDetailsContent from "@/components/Movement/MovementDetailsContent";
import MovementsList from "@/components/Movement/MovementsList";
import MovementsFilterButtons from "@/components/MovementsFilterButtons";
import { Button } from "@/components/ui/Button";
import { AppModal } from "@/components/ui/Modal";
import { useMovements } from "@/context/MovementsContext";
import useMovementsFilterButtons from "@/hooks/useMovementsFilterButtons";
import { IMovement, TKeyPeriodFilter } from "@/types/movements";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { movements, changeKeyPeriodFilter } = useMovements();
  const { filterByPeriod } = useMovementsFilterButtons(movements);
  const isInitialized = useRef(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [filteredMovements, setFilteredMovements] = useState<IMovement[]>([]);
  const [selectedMovement, setSelectedMovement] = useState<IMovement | null>(
    null
  );

  const openMovementModal = useCallback((movement: IMovement) => {
    setSelectedMovement(movement);
    setIsModalOpen(true);
  }, []);

  const closeMovementModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMovement(null);
  }, []);

  const applyMovementFilter = useCallback(
    (filterKey: TKeyPeriodFilter) => {
      const filtered = filterByPeriod(filterKey);
      changeKeyPeriodFilter(filterKey);
      setFilteredMovements(filtered);
    },
    [filterByPeriod, changeKeyPeriodFilter]
  );

  const navigateToAddMovement = useCallback(() => {
    router.navigate("/movement");
  }, [router]);

  useEffect(() => {
    if (isInitialized.current && movements.length > 0) {
      applyMovementFilter("today");
      isInitialized.current = false;
    }
  }, [applyMovementFilter, movements]);

  return (
    <>
      <View style={styles.container}>
        <BalanceDisplay />
        <View style={styles.displayContainer}>
          <Button text="Add movement" onPress={navigateToAddMovement} />
          <Button
            text="See your detail"
            onPress={() => router.navigate("/transaction")}
          />
        </View>

        {/* <FinanceLineChart /> */}
        <Divider />

        <MovementsFilterButtons handleFilter={applyMovementFilter} />
        <MovementsList
          movements={filteredMovements}
          onMovementPress={openMovementModal}
        />
      </View>

      <AppModal
        title="Movement Details"
        visible={isModalOpen}
        onClose={closeMovementModal}
      >
        {selectedMovement && (
          <MovementDetailsContent movement={selectedMovement} />
        )}
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 20,
  },
  displayContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    gap: 8,
  },
});
