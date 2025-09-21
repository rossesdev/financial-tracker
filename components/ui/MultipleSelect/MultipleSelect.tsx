import { Option } from "@/types/general";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Chip } from "../Chip";
import { ModalHeader } from "./ModalHeader";
import { OptionItem } from "./OptionItem";
import { useSelection } from "./useSelection";

interface MultipleSelectProps {
  values: string[];
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (values: string[]) => void;
  label?: string;
  error?: string;
  maxSelections?: number;
  testID?: string;
}

const MODAL_CONFIG = {
  maxHeight: "60%",
  borderRadius: 16,
  backdropOpacity: 0.35,
} as const;

const CHIP_CONFIG = {
  horizontalSpacing: 6,
  verticalSpacing: 2,
} as const;

export function MultipleSelect({
  values,
  options,
  placeholder = "Selecciona opciones",
  disabled = false,
  onChange,
  label,
  maxSelections,
  testID,
}: MultipleSelectProps) {
  const [visible, setVisible] = useState(false);

  const { selectedLabels, isSelectionLimitReached } = useSelection(
    values,
    options,
    maxSelections
  );

  const handleSelect = useCallback(
    (value: string) => {
      const isSelected = values.includes(value);
      let newValues: string[];

      if (isSelected) {
        newValues = values.filter((v) => v !== value);
      } else {
        if (isSelectionLimitReached) {
          return;
        }
        newValues = [...values, value];
      }

      onChange(newValues);
    },
    [values, onChange, isSelectionLimitReached]
  );

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleSelectAll = useCallback(() => {
    if (maxSelections && options.length > maxSelections) {
      return;
    }
    onChange(options.map((opt) => opt.value));
  }, [onChange, options, maxSelections]);

  const handleCloseModal = useCallback(() => {
    setVisible(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    if (!disabled) {
      setVisible(true);
    }
  }, [disabled]);

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={handleOpenModal}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar opciones. ${values.length} opciones seleccionadas`}
        accessibilityHint="Toca para abrir el selector"
      >
        <View style={styles.inputContent}>
          {values.length === 0 ? (
            <Text style={styles.placeholder}>{placeholder}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsContainer}
              contentContainerStyle={styles.chipsContent}
            >
              {selectedLabels.map((label, index) => (
                <View
                  key={`${values[index]}-${index}`}
                  style={styles.chipWrapper}
                >
                  <Chip label={label} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
        accessibilityViewIsModal
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.panel, { maxHeight: MODAL_CONFIG.maxHeight }]}
          >
            <ModalHeader
              title={label || "Selecciona"}
              hasSelections={values.length > 0}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              onClose={handleCloseModal}
            />

            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <OptionItem
                  option={item}
                  isSelected={values.includes(item.value)}
                  onSelect={handleSelect}
                />
              )}
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
    margin: 1,
  },
  input: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#bfbfbf",
    borderRadius: 5,
    paddingHorizontal: 10,
    minHeight: 40,
    color: "#000",
  },
  inputDisabled: { backgroundColor: "#F5F5F5", opacity: 0.7 },
  valueText: { color: "#111", flex: 1 },
  placeholder: { color: "#bfbfbf" },
  chevron: { color: "#555", marginLeft: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  separator: { height: 8 },
  inputContent: {
    flex: 1,
  },
  chipsContainer: {
    flex: 1,
  },
  chipsContent: {
    alignItems: "center",
    paddingVertical: CHIP_CONFIG.verticalSpacing,
  },
  chipWrapper: {
    marginRight: CHIP_CONFIG.horizontalSpacing,
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
});
