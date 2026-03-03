import { useMovements } from "@/context/MovementsContext";
import { formatAmount } from "@/utils/current";
import { StyleSheet, Text, View } from "react-native";

export function BalanceDisplay({ title }: { title?: string }) {
  const { movements } = useMovements();

  const calculateTotalBalance = () => {
    let total = 0;

    if (movements.length === 0) return total;

    movements.forEach((movement) => {
      if (movement.typeOfMovement === "1") {
        total += movement.amount;
      } else {
        total -= movement.amount;
      }
    });
    return total;
  };

  return (
    <View>
      <Text style={styles.subtitle}>{title || "This is your summary"}</Text>
      <Text style={styles.title}>
        ${formatAmount(calculateTotalBalance())}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 5,
    margin: "auto",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 18,
    color: "#666",
  },
});
