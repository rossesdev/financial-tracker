import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Chip } from "./ui/Chip";

type TMovementsFilterButtonsProps = {
  handleFilter: (filter: "today" | "week" | "month") => void;
};

export default function MovementsFilterButtons({
  handleFilter,
}: TMovementsFilterButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => handleFilter("today")}>
        <Chip label="Today" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => handleFilter("week")}>
        <Chip label="This week" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => handleFilter("month")}>
        <Chip label="This month" />
      </TouchableOpacity>
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
