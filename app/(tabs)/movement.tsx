import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/Date/DatePicker";
import { useMovements } from "@/context/MovementsContext";
import categories from "@/mocks/categories.json";
import paymentMethods from "@/mocks/paymentMethods.json";
import typeOfMovements from "@/mocks/typeOfMovements.json";
import { IMovement } from "@/types/movements";
import { addPoints } from "@/utils/current";
import { router } from "expo-router";

export default function Movement() {
  const { addMovement } = useMovements();

  const [movement, setMovement] = useState<Omit<IMovement, "id">>({
    description: "",
    amount: "",
    date: new Date(),
    paymentMethod: "",
    typeOfMovement: "",
    category: "",
  });

  const handleChangeMovement = <T,>(name: string, value: T) => {
    setMovement({ ...movement, [name]: value });
  };

  const handleAmountChange = (newAmount: string) => {
    const formattedValue = addPoints(newAmount);
    handleChangeMovement("amount", formattedValue);
  };

  const saveMovement = () => {
    /* TODO: Add security measures */
    addMovement(movement);
    router.navigate("/");
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.subtitle}>Income or Expense Entry</Text>
      <View style={styles.row}>
        <Select
          value={movement.typeOfMovement}
          options={typeOfMovements}
          placeholder="Select the type"
          onChange={(e) => handleChangeMovement("typeOfMovement", e)}
        />
        <View style={{ flex: 2 }}>
          <Input
            value={movement.amount}
            onChange={handleAmountChange}
            placeholder="Amount"
            keyboardType="numeric"
          />
        </View>
      </View>
      <View style={styles.row}>
        <Select
          value={movement.category}
          options={categories}
          placeholder="Select a category"
          onChange={(e) => handleChangeMovement("category", e)}
        />
        <Select
          value={movement.paymentMethod}
          options={paymentMethods}
          placeholder="Select payment method"
          onChange={(e) => handleChangeMovement("paymentMethod", e)}
        />
      </View>
      <Input
        value={movement.description}
        placeholder="Description"
        onChange={(e) => handleChangeMovement("description", e)}
      />

      <DatePicker
        date={movement.date}
        onChange={(date) => handleChangeMovement("date", date)}
      />

      <View style={styles.buttonContainer}>
        <Button text="Save" onPress={saveMovement} variant="dark" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    color: "#666",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonContainer: {
    marginLeft: 10,
    marginRight: "auto",
    marginTop: 20,
  },
});
