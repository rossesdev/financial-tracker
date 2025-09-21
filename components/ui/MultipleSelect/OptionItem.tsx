import { Option } from "@/types/general";
import { FC } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OptionItemProps {
  option: Option;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

export const OptionItem: FC<OptionItemProps> = ({
  option,
  isSelected,
  onSelect,
}) => (
  <TouchableOpacity
    style={[styles.option, isSelected && styles.optionSelected]}
    onPress={() => onSelect(option.value)}
    accessibilityRole="button"
    accessibilityState={{ selected: isSelected }}
    accessibilityLabel={`${option.label}${isSelected ? ", seleccionado" : ""}`}
  >
    <View style={styles.optionContent}>
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text
        style={[styles.optionText, isSelected && styles.optionTextSelected]}
      >
        {option.label}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionSelected: { backgroundColor: "#F0F4FF" },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#084686",
    borderRadius: 3,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkmark: {
    color: "#084686",
    fontSize: 14,
    fontWeight: "bold",
  },
  optionText: { color: "#111", flex: 1 },
  optionTextSelected: { fontWeight: "600" },
  checkboxSelected: {
    backgroundColor: "#084686",
  },
});
