import { BalanceDisplay } from "@/components/BalanceDisplay";
import MovementDetailsContent from "@/components/Movement/MovementDetailsContent";
import MovementsList from "@/components/Movement/MovementsList";
import MovementsFilterButtons from "@/components/MovementsFilterButtons";
import { Button } from "@/components/ui/Button";
import { AppModal } from "@/components/ui/Modal";
import { useMovements } from "@/context/MovementsContext";
import useMovementsFilterButtons from "@/hooks/useMovementsFilterButtons";
import { IMovement } from "@/types/movements";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { movements } = useMovements();
  const { filterByPeriod } = useMovementsFilterButtons(movements);

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
    (filterKey: "today" | "week" | "month") => {
      const filtered = filterByPeriod(filterKey);
      setFilteredMovements(filtered);
    },
    [filterByPeriod]
  );

  const navigateToAddMovement = useCallback(() => {
    router.navigate("/explore");
  }, [router]);

  useEffect(() => {
    applyMovementFilter("today");
  }, [applyMovementFilter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text>Hi Rose!</Text>
        <Text>Track your Finances</Text>

        <BalanceDisplay />
        <Button text="Add movement" onPress={navigateToAddMovement} />
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
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
