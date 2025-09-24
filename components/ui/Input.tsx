import React from "react";
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  name?: string;
  value: string;
  onChange: (e: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  isTextarea?: boolean;
};

export function Input({
  name,
  value,
  onChange,
  placeholder,
  keyboardType,
  isTextarea = false,
}: Props) {
  return (
    <View style={styles.container}>
      {name && <Text>{name}</Text>}

      <TextInput
        style={styles.input}
        onChangeText={onChange}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#bfbfbf"
        keyboardType={keyboardType || "default"}
        multiline={isTextarea}
        numberOfLines={4}
        maxLength={isTextarea ? 500 : 10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#bfbfbf",
    borderRadius: 5,
    padding: 10,
    color: "#000",
  },
});
