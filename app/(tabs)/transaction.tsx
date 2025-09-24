import { Button } from "@/components/ui/Button";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Input } from "@/components/ui/Input";
import { IEntity } from "@/types/entities";
import { addPoints } from "@/utils/current";
import { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import entities from "../../mocks/entities.json";

const imageMap: { [key: string]: any } = {
  nequi: require("../../assets/images/nequi.webp"),
  daviplata: require("../../assets/images/daviplata.png"),
  cuenta_ahorros: require("../../assets/images/cuenta_ahorros.png"),
  pocket: require("../../assets/images/pocket.png"),
  cash: require("../../assets/images/cash.png"),
};

// TODO: Refactor this screen

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = (screenWidth - 50) / 3;

export default function Transaction() {
  const [selectedEntities, setSelectedEntities] = useState<{
    [id: number]: "from" | "to";
  }>({});
  const [amountTransaction, setAmountTransaction] = useState<string>("0");

  const handleSelectEntity = (id: number) => {
    const existID = selectedEntities[id];

    if (!existID && Object.keys(selectedEntities).length > 1) return;

    if (existID) {
      setSelectedEntities((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      return;
    }

    const existFrom = Object.values(selectedEntities).includes("from");
    setSelectedEntities((prev) => ({
      ...prev,
      [id]: existFrom ? "to" : "from",
    }));
  };

  const existFromEntity = useMemo(() => {
    return Object.values(selectedEntities).includes("from");
  }, [selectedEntities]);

  const getBgCard = (id: number) => {
    if (!selectedEntities[id]) return styles.cardNoSelected;

    return selectedEntities[id] === "from"
      ? styles.cardSelectedFrom
      : styles.cardSelectedTo;
  };

  const { fromEntity, toEntity } = useMemo(() => {
    const fromId = Object.keys(selectedEntities).find(
      (key) => selectedEntities[parseInt(key)] === "from"
    );

    const toId = Object.keys(selectedEntities).find(
      (key) => selectedEntities[parseInt(key)] === "to"
    );

    return {
      fromEntity: fromId
        ? entities.find((entity) => entity.id === parseInt(fromId))
        : null,
      toEntity: toId
        ? entities.find((entity) => entity.id === parseInt(toId))
        : null,
    };
  }, [selectedEntities]);

  const handleChangeAmount = (newAmount: string) => {
    const formattedValue = addPoints(newAmount);
    setAmountTransaction(formattedValue);
  };

  const hasEnoughBalance = useMemo(() => {
    if (!fromEntity) return false;
    const available = parseInt(fromEntity.total_amount.replace(/\./g, ""));
    const current = parseInt(amountTransaction.replace(/\./g, ""));

    return current <= available;
  }, [fromEntity, amountTransaction]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.subtitle}>
        Record your transactions{"\n"} between different{" "}
        <Text style={{ fontWeight: "bold" }}>entities</Text>
      </Text>

      {(!fromEntity || !toEntity) && (
        <Text style={styles.questions}>
          {existFromEntity
            ? "Select the entity to which you want to send money"
            : "Select the entity from which the money comes"}
        </Text>
      )}

      <View style={styles.cardContainer}>
        {entities.map((entity: IEntity) => (
          <Pressable
            key={entity.id}
            onPress={() => handleSelectEntity(entity.id)}
            style={[getBgCard(entity.id), styles.card, { width: cardWidth }]}
          >
            <View style={styles.topContent}>
              <Image source={imageMap[entity.image]} style={styles.image} />
              <Text style={styles.entityName}>{entity.name}</Text>
            </View>

            <Text style={styles.entityAmount}>${entity.total_amount}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 20 }}>
        <Text style={{ textAlign: "center", color: "#666" }}>
          Select up to two entities to proceed
        </Text>
        <View>
          {fromEntity?.id && toEntity?.id && (
            <View>
              <View style={styles.transactionSummary}>
                <Text style={styles.transactionEntityName}>
                  {fromEntity?.name}
                </Text>
                <IconSymbol name="arrow.right" color="black" />
                <Text style={styles.transactionEntityName}>
                  {toEntity?.name}
                </Text>
              </View>
              <Text style={styles.transactionLimit}>
                Available balance: {fromEntity.total_amount}
              </Text>

              <Text style={{ textAlign: "center", color: "#666" }}>
                How much money do you want to transfer?
              </Text>
              <Input
                value={amountTransaction}
                onChange={handleChangeAmount}
                placeholder="Amount"
                keyboardType="numeric"
              />
              {!hasEnoughBalance ? (
                <Text style={styles.exceedBalance}>
                  The amount you entered exceeds the available balance.
                </Text>
              ) : (
                <View style={styles.saveButton}>
                  <Button
                    text="Save transaction"
                    variant="dark"
                    onPress={() => {}}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    color: "#666",
    textAlign: "center",
  },
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  card: {
    padding: 20,

    borderRadius: 8,
    borderWidth: 1,

    alignItems: "center",
    height: 160,
    justifyContent: "space-between",
    marginBottom: 5,
  },
  cardNoSelected: { backgroundColor: "#f9f9f9", borderColor: "#e0e0e0" },
  cardSelectedFrom: {
    backgroundColor: "#9bc2e924",
    borderColor: "#084686",
  },
  cardSelectedTo: {
    backgroundColor: "#abf07f24",
    borderColor: "#2db100",
  },
  image: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  entityName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  entityAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#084686",
    marginBottom: 0,
  },
  topContent: {
    alignItems: "center",
  },
  questions: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "500",
    color: "#084686",
  },
  transactionSummary: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  transactionEntityName: {
    fontSize: 18,
    fontWeight: "600",
  },
  transactionLimit: {
    fontSize: 14,
    color: "#084686",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 10,
  },
  exceedBalance: {
    color: "#c40505",
    fontSize: 14,
    fontWeight: "500",
  },
  saveButton: {
    marginRight: "auto",
  },
});
