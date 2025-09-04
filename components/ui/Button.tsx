import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  onPress: () => void;
  text: string;
};

export function Button({ onPress, text }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#d1d1d159",
    padding: 5,
    borderRadius: 5,
  },
});
