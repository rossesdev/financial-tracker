import { IMovement } from "@/types/movements";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import MovementListItem from "./MovementListItem";

export default function MovementsList({
  movements,
  onMovementPress,
}: {
  movements: IMovement[];
  onMovementPress: (movement: IMovement) => void;
}) {
  return (
    <FlatList
      data={movements}
      renderItem={({ item }) => (
        <MovementListItem movement={item} onPress={onMovementPress} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={{ paddingVertical: 8 }}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  separator: { height: 8 },
});
