import { useMovements } from "@/context/MovementsContext";
import { IMovement } from "@/types/movements";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MovementListItem from "./MovementListItem";

export default function MovementsList({
  movements,
  onMovementPress,
}: {
  movements: IMovement[];
  onMovementPress: (movement: IMovement) => void;
}) {
  const { keyPeriodFilter } = useMovements();

  const navigateToAllMovement = () => {
    router.navigate("/allMovements");
  };

  return (
    <FlatList
      data={movements}
      renderItem={({ item }) => (
        <MovementListItem
          keyPeriodFilter={keyPeriodFilter}
          movement={item}
          onPress={onMovementPress}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={{ paddingVertical: 8 }}
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={() => (
        <TouchableOpacity onPress={navigateToAllMovement}>
          <Text>All movements</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  separator: { height: 8 },
});
