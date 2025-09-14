import MovementListItem from "@/components/Movement/MovementListItem";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useMovements } from "@/context/MovementsContext";
import { IMovement } from "@/types/movements";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Stack } from "expo-router";
import React, { useMemo } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AllMovementsScreen() {
  const { movements, keyPeriodFilter } = useMovements();

  const groupedMovements = useMemo(() => {
    const grouped = movements.reduce(
      (groups: { [key: string]: IMovement[] }, movement) => {
        const date = new Date(movement.date);
        const monthKey = format(date, "MMMM yyyy", { locale: es });

        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(movement);
        return groups;
      },
      {}
    );

    return Object.keys(grouped)
      .sort(
        (a, b) =>
          new Date(grouped[b][0].date).getTime() -
          new Date(grouped[a][0].date).getTime()
      )
      .map((monthKey) => ({
        title: monthKey.charAt(0).toUpperCase() + monthKey.slice(1),
        data: grouped[monthKey],
      }));
  }, [movements]);

  return (
    <>
      <Stack.Screen options={{ title: "All movements" }} />
      <View style={styles.container}>
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

        <SectionList
          sections={groupedMovements}
          renderItem={({ item }) => (
            <MovementListItem
              keyPeriodFilter={keyPeriodFilter}
              movement={item}
              onPress={() => {}}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingVertical: 8 }}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
  },
  separator: { height: 8 },
  sectionHeader: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
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
