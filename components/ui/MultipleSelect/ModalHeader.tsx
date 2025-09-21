import { FC } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ModalHeaderProps {
  title: string;
  hasSelections: boolean;
  onSelectAll: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export const ModalHeader: FC<ModalHeaderProps> = ({
  title,
  hasSelections,
  onSelectAll,
  onClearAll,
  onClose,
}) => (
  <View style={styles.panelHeader}>
    <Text style={styles.panelTitle}>{title}</Text>
    <View style={styles.headerActions}>
      {hasSelections && (
        <TouchableOpacity onPress={onClearAll} style={styles.actionBtn}>
          <Text style={styles.actionText}>Limpiar</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onSelectAll} style={styles.actionBtn}>
        <Text style={styles.actionText}>Todo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    color: "#084686",
    fontSize: 14,
    fontWeight: "500",
  },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  closeText: { fontSize: 18, color: "#666" },
});
