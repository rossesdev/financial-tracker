import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "./ui/IconSymbol";

export default function FilterAllMovements() {
  return (
    <View style={styles.filterContainer}>
      {/* TODO: Implement search functionality & create a file for it */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 6,
          paddingHorizontal: 10,
        }}
      >
        <IconSymbol
          name="paperplane.fill"
          size={20}
          weight="medium"
          color="#999"
        />
        <TextInput
          placeholder="Search movement..."
          style={{ flex: 1, padding: 10 }}
        />
      </View>
      <TouchableOpacity onPress={() => {}}>
        <IconSymbol
          name="slider.horizontal.3"
          size={30}
          weight="medium"
          color="#666"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
  },
});
