import MovementListItem from "@/components/Movement/MovementListItem";
import { Chip } from "@/components/ui/Chip";
import { RangePicker } from "@/components/ui/Date/RangePicker";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { MultipleSelect } from "@/components/ui/MultipleSelect/MultipleSelect";
import { useMovements } from "@/context/MovementsContext";
import { IMovement } from "@/types/movements";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import categories from "../config/categories.json";
import entities from "../config/entities.json";
import typeOfMovements from "../config/typeOfMovements.json";

export default function AllMovementsScreen() {
  const {
    filteredMovements,
    keyPeriodFilter,
    filters,
    updateFilter,
    clearAllFilters,
  } = useMovements();
  const [allFiltersExpanded, setAllFiltersExpanded] = useState(false);

  const groupedMovements = useMemo(() => {
    const grouped = filteredMovements.reduce(
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
  }, [filteredMovements]);

  return (
    <>
      <Stack.Screen options={{ title: "All movements" }} />
      <View style={styles.container}>
        <View style={styles.filterContainer}>
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
              name="magnifyingglass"
              size={20}
              weight="medium"
              color="#999"
            />
            <TextInput
              placeholder="Search movement..."
              style={{ flex: 1, padding: 10 }}
              value={filters.search}
              onChangeText={(text) => updateFilter("search", text)}
            />
          </View>
          <TouchableOpacity
            onPress={() => setAllFiltersExpanded(!allFiltersExpanded)}
          >
            <IconSymbol
              name="slider.horizontal.3"
              size={30}
              weight="medium"
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {allFiltersExpanded && (
          <View style={styles.filtersSection}>
            <TouchableOpacity onPress={clearAllFilters}>
              <Chip label="Clear all filters" color="red" />
            </TouchableOpacity>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Rango de fechas:</Text>
              <RangePicker
                startDate={filters.dateRange?.startDate}
                endDate={filters.dateRange?.endDate}
                onChange={({ startDate, endDate }) =>
                  updateFilter("dateRange", { startDate, endDate })
                }
              />
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Categories:</Text>
              <MultipleSelect
                values={filters.categories}
                options={categories}
                placeholder="Select categories"
                label="Categories"
                onChange={(values) => updateFilter("categories", values)}
                testID="categories-filter"
              />
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Entities:</Text>
              <MultipleSelect
                values={filters.entities}
                options={entities.map((entity) => ({
                  name: entity.name,
                  value: entity.id.toString(),
                }))}
                placeholder="Select entities"
                label="Entities"
                onChange={(values) => updateFilter("entities", values)}
                testID="entities-filter"
              />
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Type of movements:</Text>
              <MultipleSelect
                values={filters.typeOfMovements}
                options={typeOfMovements}
                placeholder="Select type of movements"
                label="Type of movements"
                onChange={(values) => updateFilter("typeOfMovements", values)}
                testID="type-of-movements-filter"
              />
            </View>
          </View>
        )}

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
              {/* <Text style={styles.sectionTotal}>$6000</Text> */}
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
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  sectionTotal: {
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
  filtersSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  filterRow: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  clearFiltersText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
