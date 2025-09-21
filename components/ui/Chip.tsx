import { StyleSheet, Text } from "react-native";

type TChipProps = {
  label: string;
  color?: "general" | "green" | "red" | "black";
};

export const Chip = ({ label, color = "general" }: TChipProps) => {
  return <Text style={{ ...styles.chip, ...styles[color] }}>{label}</Text>;
};

const styles = StyleSheet.create({
  chip: {
    width: "auto",
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
    fontWeight: 500,
  },
  green: {
    backgroundColor: "#1eb11e6b",
    color: "#027102",
  },
  red: {
    backgroundColor: "#B11E1E6B",
    color: "#710202",
  },
  black: {
    backgroundColor: "black",
    color: "white",
  },
  general: {
    backgroundColor: "#9bc2e9",
    color: "#084686",
  },
});
