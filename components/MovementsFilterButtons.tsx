import { StyleSheet, View } from "react-native";
import { Button } from "./ui/Button";

type TMovementsFilterButtonsProps = {
  handleFilter: (filter: "today" | "week" | "month") => void;
};

export default function MovementsFilterButtons({
  handleFilter,
}: TMovementsFilterButtonsProps) {
  return (
    <View style={styles.container}>
      <Button text="Today" onPress={() => handleFilter("today")} />
      <Button text="This week" onPress={() => handleFilter("week")} />
      <Button text="This month" onPress={() => handleFilter("month")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    gap: 8,
  },
});
