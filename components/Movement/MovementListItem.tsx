import { IMovement, TKeyPeriodFilter } from "@/types/movements";
import { getCategoryData } from "@/utils/getDataByType";
import { format } from "date-fns";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol, IconSymbolName } from "../ui/IconSymbol";

interface IMovementListItemProps {
  movement: IMovement;
  onPress: (movement: IMovement) => void;
  keyPeriodFilter: TKeyPeriodFilter;
}

const DESCRIPTION_MAX_LENGTH = 20;
const INCOME_TYPE = "1";

export default function MovementListItem({
  movement,
  onPress,
  keyPeriodFilter,
}: IMovementListItemProps) {
  const { label, icon } = getCategoryData(movement.category);

  const renderDate = () => {
    switch (keyPeriodFilter) {
      case "today":
        return <Text>{format(movement.date, "HH:mm")}</Text>;
      case "week":
        return <Text>{format(movement.date, "EEEE")}</Text>;
      case "month":
        return <Text>{format(movement.date, "MMMM, d")}</Text>;
      default:
        return <Text>{format(movement.date, "PP")}</Text>;
    }
  };

  const truncatedDescription =
    movement.description.length > DESCRIPTION_MAX_LENGTH
      ? `${movement.description.substring(0, DESCRIPTION_MAX_LENGTH)}...`
      : movement.description;

  const isIncome = movement.typeOfMovement === INCOME_TYPE;
  const amountStyle = [
    isIncome ? styles.income : styles.expense,
    styles.amount,
  ];

  return (
    <TouchableOpacity onPress={() => onPress(movement)}>
      <View style={styles.movementItem}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.iconContainer}>
            <IconSymbol name={icon as IconSymbolName} size={20} color="white" />
          </View>

          <View>
            <Text style={{ fontWeight: 500 }}>{label}</Text>
            <Text style={{ color: "#666" }}>{truncatedDescription}</Text>
          </View>
        </View>

        <View style={styles.rightSide}>
          <Text style={amountStyle}>
            {isIncome ? "+" : "-"}${movement.amount}
          </Text>
          <Text style={styles.date}>{renderDate()}</Text>
        </View>
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
    borderRadius: 5,
  },
  income: {
    color: "#2a9f02",
  },
  expense: { color: "#d63300" },
  iconContainer: {
    backgroundColor: "#084686",
    borderRadius: "50%",
    padding: 5,
  },
  rightSide: {
    alignItems: "flex-end",
  },
  amount: {
    fontWeight: "bold",
  },
  date: {
    color: "#666",
  },
});
