import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";

interface ButtonProps {
  onPress: () => void;
  text: string;
  variant?: "light" | "dark";
}

interface ButtonStyles {
  container: ViewStyle;
  text: TextStyle;
}

const createButtonStyles = (variant: "light" | "dark"): ButtonStyles => ({
  container: {
    ...styles.baseButton,
    backgroundColor: variant === "dark" ? "#084686" : "#d1d1d159",
  },
  text: {
    color: variant === "dark" ? "#fff" : "#000",
  },
});

export function Button({ onPress, text, variant = "light" }: ButtonProps) {
  const buttonStyles = createButtonStyles(variant);

  return (
    <Pressable onPress={onPress} style={buttonStyles.container}>
      <Text style={buttonStyles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
});
