import { BalanceDisplay } from "@/components/BalanceDisplay";
import FinanceLineChart from "@/components/charts/FinanceLineChart";
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
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Rose</Text>

        <BalanceDisplay />
        <Button text="Add movement" onPress={navigateToAddMovement} />
        <FinanceLineChart />
        <View style={styles.divider} />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginHorizontal: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    alignSelf: "stretch",
    marginTop: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    alignSelf: "flex-start",
  },
});
