import { IMovement } from "@/types/movements";
import { getLabelById } from "@/utils/getDataByType";
import { format } from "date-fns";
import { Text } from "react-native";
import { Chip } from "../ui/Chip";

export default function MovementDetailsContent({
  movement,
}: {
  movement: IMovement;
}) {
  return (
    <>
      <Chip
        label={getLabelById(movement.typeOfMovement, "typeOfMovements")}
        color={movement.typeOfMovement === "1" ? "green" : "red"}
      />
      <Text>Amount: ${movement.amount}</Text>
      <Text>Category: {getLabelById(movement.category, "categories")}</Text>
      <Text>
        Entity: {getLabelById(movement.entity || '', "entities")}
      </Text>
      <Text>Date: {format(movement.date, "PPpp")}</Text>
      <Text>Description: {movement.description}</Text>
    </>
  );
}
