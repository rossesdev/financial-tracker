import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Option = { name: string; value: string };

type SelectProps = {
  value: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
};

export function Select({
  value,
  options,
  placeholder = "Selecciona una opción",
  disabled = false,
  onChange,
  label,
}: SelectProps) {
  const [visible, setVisible] = useState(false);

  const selectedName = useMemo(() => {
    const found = options.find((opt) => opt.value === value);
    return found?.name ?? "";
  }, [options, value]);

  const handleSelect = (value: string) => {
    setVisible(false);
    onChange(value);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.input]}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.valueText, !selectedName && styles.placeholder]}>
          {selectedName || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{label || "Selecciona"}</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingVertical: 8 }}
              keyboardShouldPersistTaps="handled"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    flex: 1,
  },
  input: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#bfbfbf",
    borderRadius: 5,
    padding: 10,
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  inputDisabled: { backgroundColor: "#F5F5F5", opacity: 0.7 },
  valueText: { color: "#111" },
  placeholder: { color: "#bfbfbf" },
  chevron: { color: "#555", marginLeft: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  panel: {
    maxHeight: "60%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  panelTitle: { flex: 1, fontWeight: "600", color: "#111" },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  closeText: { fontSize: 18 },
  option: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  optionSelected: { backgroundColor: "#F0F4FF" },
  optionText: { color: "#111" },
  optionTextSelected: { fontWeight: "600" },
  separator: { height: 8 },
});
