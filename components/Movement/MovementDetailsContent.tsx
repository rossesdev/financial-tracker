import { IMovement } from "@/types/movements";
import { getLabelById } from "@/utils/getLabel";
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
        Payment Method: {getLabelById(movement.paymentMethod, "paymentMethods")}
      </Text>
      <Text>Date: {new Date(movement.date).toLocaleDateString()}</Text>
      <Text>Description: {movement.description}</Text>
    </>
  );
}
