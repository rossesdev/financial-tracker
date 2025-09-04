import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Keyboard,
  SafeAreaView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useMovements } from "@/context/MovementsContext";
import categories from "@/mocks/categories.json";
import paymentMethods from "@/mocks/paymentMethods.json";
import typeOfMovements from "@/mocks/typeOfMovements.json";
import { IMovement } from "@/types/movements";
import { router } from "expo-router";

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
          <Select
            value={movement.typeOfMovement}
            options={typeOfMovements}
            placeholder="Select the type of movement"
            onChange={(e) => handleChangeMovement("typeOfMovement", e)}
          />
          <Input
            value={movement.amount}
            onChange={handleAmountChange}
            placeholder="Amount"
            keyboardType="numeric"
          />
          <Input
            value={movement.description}
            placeholder="Description"
            onChange={(e) => handleChangeMovement("description", e)}
            isTextarea
          />
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
          <DateTimePicker
            testID="dateTimePicker"
            value={new Date(movement.date)}
            mode="date"
            is24Hour={true}
            onChange={(_, newDate) =>
              handleChangeMovement("date", newDate || new Date())
            }
          />
          <Button text="Save" onPress={saveMovement} />
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
