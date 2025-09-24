import { useMovements } from "@/context/MovementsContext";
import { StyleSheet, Text, View } from "react-native";

export function BalanceDisplay() {
  const { movements } = useMovements();

  const calculateTotalBalance = () => {
    let total = 0;

    if (movements.length === 0) return total;

    movements.forEach((movement) => {
      const cleanNumber = movement.amount.replace(/\./g, "");
      if (movement.typeOfMovement === "1") {
        total += parseInt(cleanNumber);
      } else {
        total -= parseInt(cleanNumber);
      }
    });
    return total;
  };

  return (
    <View>
      <Text style={styles.subtitle}>This is your summary</Text>
      <Text style={styles.title}>
        ${calculateTotalBalance().toLocaleString("es-ES")}
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
    fontSize: 18,
    color: "#666",
  },
});
