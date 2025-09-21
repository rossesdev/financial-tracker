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
  const renderDate = () => {
    switch (keyPeriodFilter) {
      case "today":
        return null;
      case "week":
        return <Text>{format(movement.date, "EEEE, d")}</Text>;
      case "month":
        return <Text>{format(movement.date, "MMMM, d")}</Text>;
      default:
        return <Text>{format(movement.date, "PP")}</Text>;
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress(movement)}>
      <View style={styles.movementItem}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons
            name={
              movement.typeOfMovement === "1" ? "add-circle" : "remove-circle"
            }
            size={24}
            color={movement.typeOfMovement === "1" ? "green" : "red"}
          />
          <View>
            <Text>{getLabelById(movement.category, "categories")}</Text>
            <Text style={{ color: "#666", fontSize: 12 }}>
              {movement.description.length > 20
                ? movement.description.substring(0, 20) + "..."
                : movement.description}
            </Text>
          </View>
        </View>

        <Text>{renderDate()}</Text>
        <Text style={styles.amount}>${movement.amount}</Text>
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
    width: "100%",
  },
  amount: {
    fontWeight: "bold",
  },
});
