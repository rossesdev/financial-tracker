import { IMovement } from "@/types/movements";
import { getLabelById } from "@/utils/getLabel";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function MovementListItem({
  movement,
  onPress,
}: {
  movement: IMovement;
  onPress: (movement: IMovement) => void;
}) {
  return (
    <TouchableOpacity onPress={() => onPress(movement)}>
      <View style={styles.movementItem}>
        <Ionicons
          name={
            movement.typeOfMovement === "1" ? "add-circle" : "remove-circle"
          }
          size={24}
          color={movement.typeOfMovement === "1" ? "green" : "red"}
        />
        <Text>${movement.amount}</Text>
        <Text>{getLabelById(movement.category, "categories")}</Text>
        <Text>{getLabelById(movement.paymentMethod, "paymentMethods")}</Text>
        <Text>{new Date(movement.date).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  movementItem: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
