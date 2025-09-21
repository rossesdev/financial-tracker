import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabTwoScreen() {
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

  const addPoints = (amount: string) => {
    const cleanNumber = amount.replace(/\./g, "");
    return new Intl.NumberFormat("es-CO").format(Number(cleanNumber));
  };

  const saveMovement = () => {
    addMovement(movement);
    router.navigate("/");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.safeArea}>
        <View>
          <Text style={styles.title}>Add Movement</Text>
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
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginHorizontal: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
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
