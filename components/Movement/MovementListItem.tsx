import { IMovement, TKeyPeriodFilter } from "@/types/movements";
import { getLabelById } from "@/utils/getLabel";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function MovementListItem({
  movement,
  onPress,
  keyPeriodFilter,
}: {
  movement: IMovement;
  onPress: (movement: IMovement) => void;
  keyPeriodFilter: TKeyPeriodFilter;
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
        {/* Today => No showing */}
        {/* Week => format(new Date(movement.date), "EEEE, d") */}
        {/* Month =>  format(new Date(movement.date), "MMMM, d") */}
        <Text>{format(movement.date, "PP")}</Text>
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
