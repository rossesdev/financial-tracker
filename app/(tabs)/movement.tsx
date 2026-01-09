import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/Date/DatePicker";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useMovements } from "@/context/MovementsContext";
import { IMovement } from "@/types/movements";
import { addPoints } from "@/utils/current";

import categories from "@/mocks/categories.json";
import entities from "@/mocks/entities.json";
import typeOfMovements from "@/mocks/typeOfMovements.json";

export default function Movement() {
  const { addMovement } = useMovements();

  const [movement, setMovement] = useState<Omit<IMovement, "id">>({
    description: "",
    amount: "",
    date: new Date(),
    typeOfMovement: "",
    category: "",
    entity: ''
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
          placeholder="Select the type*"
          onChange={(e) => handleChangeMovement("typeOfMovement", e)}
        />
        <View style={{ flex: 1.5 }}>
          <Input
            value={movement.amount}
            onChange={handleAmountChange}
            placeholder="Amount*"
            keyboardType="numeric"
          />
        </View>
      </View>
      <View style={styles.row}>
        <Select
          value={movement.category}
          options={categories}
          placeholder="Select a category*"
          onChange={(e) => handleChangeMovement("category", e)}
        />
      </View>
      <Input
        value={movement.description}
        placeholder="Description*"
        onChange={(e) => handleChangeMovement("description", e)}
      />
      <View style={styles.row}>
        <Select
          value={movement.entity || ""}
          options={entities.map((entity) => ({
            name: entity.name,
            value: entity.id.toString(),
          }))}
          placeholder="Select an entity"
          onChange={(e) => handleChangeMovement("entity", e)}
        />
        <DatePicker
          date={movement.date}
          onChange={(date) => handleChangeMovement("date", date)}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button text="Save" onPress={saveMovement} variant="dark" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 20,
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
    gap: 5,
  },
  buttonContainer: {
    marginRight: "auto",
    marginTop: 20,
  },
});
