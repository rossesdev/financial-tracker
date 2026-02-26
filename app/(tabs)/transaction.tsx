import { BalanceDisplay } from "@/components/BalanceDisplay";
import { Button } from "@/components/ui/Button";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Input } from "@/components/ui/Input";
import KeyboardSpacer from "@/components/ui/KeyboardSpacer";
import { Select } from "@/components/ui/Select";
import { useEntities } from "@/context/EntitiesContext";
import { useMovements } from "@/context/MovementsContext";
import { IEntity } from "@/types/entities";
import { addPoints } from "@/utils/current";
import { IMovement } from "@/types/movements";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const { entities } = useEntities();
  const scrollRef = useRef<ScrollView | null>(null);

  const [isTransfering, setIsTransfering] = useState(false);

  const [selectedEntities, setSelectedEntities] = useState<{
    from: number;
    to: number;
  }>({ from: 0, to: 0 });
  const [amountTransaction, setAmountTransaction] = useState<string>("0");

  const handleIsTransfering = () => {
    setIsTransfering((prev) => !prev);
  };

  const handleSelectEntity = (id: number, type: "from" | "to") => {
    setSelectedEntities((prev) => ({
      ...prev,
      [type]: id,
    }));
  };

  const getBgCard = (id: number) => {
    return selectedEntities.from === id
      ? styles.cardSelectedFrom
      : selectedEntities.to === id
      ? styles.cardSelectedTo
      : styles.cardNoSelected;
  };

  const { fromEntity, toEntity } = useMemo(() => {
    return {
      fromEntity: selectedEntities.from
        ? entities.find((entity) => entity.id === selectedEntities.from)
        : null,
      toEntity: selectedEntities.to
        ? entities.find((entity) => entity.id === selectedEntities.to)
        : null,
    };
  }, [selectedEntities]);

  useEffect(() => {
    if ((fromEntity?.id && toEntity?.id) || isTransfering) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [fromEntity?.id, toEntity?.id, isTransfering]);

  const handleChangeAmount = (newAmount: string) => {
    const formattedValue = addPoints(newAmount);
    setAmountTransaction(formattedValue);
  };

  const { addMovement } = useMovements();

  const handleSaveTransaction = () => {
    if (!fromEntity || !toEntity) return;

    // ensure enough balance
    if (!hasEnoughBalance) return;

    const description = `transaction between entities (${fromEntity.name} -> ${toEntity.name})`;

    const movementOut: Omit<IMovement, "id"> = {
      description,
      amount: amountTransaction,
      typeOfMovement: "2",
      category: "8",
      date: new Date(),
      entity: String(selectedEntities.from),
    };

    const movementIn: Omit<IMovement, "id"> = {
      description,
      amount: amountTransaction,
      typeOfMovement: "1",
      category: "8",
      date: new Date(),
      entity: String(selectedEntities.to),
    };

    addMovement(movementOut);
    addMovement(movementIn);

    // reset form
    setSelectedEntities({ from: 0, to: 0 });
    setAmountTransaction("0");
    setIsTransfering(false);
  };

  const hasEnoughBalance = useMemo(() => {
    if (!fromEntity) return false;
    const available = parseInt(fromEntity.total_amount.replace(/\./g, ""));
    const current = parseInt(amountTransaction.replace(/\./g, ""));

    return current <= available;
  }, [fromEntity, amountTransaction]);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <BalanceDisplay title="Total:" />

        <Text style={styles.questions}>Balance Breakdown</Text>

        <View style={styles.cardContainer}>
          {entities.map((entity: IEntity) => (
            <Pressable
              key={entity.id}
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
          <TouchableOpacity
            style={styles.transferContent}
            onPress={handleIsTransfering}
          >
            <Text style={styles.questions}>Do you want to transfer money?</Text>
            <IconSymbol
              size={20}
              name="chevron.down"
              color="#084686"
              style={[
                styles.iconTransfer,
                isTransfering && styles.rotateIconTransfer,
              ]}
            />
          </TouchableOpacity>

          {isTransfering && (
            <>
              <View style={styles.transferOptions}>
                <Select
                  value={selectedEntities.from.toString() || ""}
                  options={entities.map((entity) => ({
                    name: entity.name,
                    value: entity.id.toString(),
                  }))}
                  placeholder="Select an entity"
                  onChange={(e) => handleSelectEntity(Number(e), "from")}
                />
                <Select
                  value={selectedEntities.to.toString() || ""}
                  options={entities.map((entity) => ({
                    name: entity.name,
                    value: entity.id.toString(),
                  }))}
                  placeholder="Select an entity"
                  onChange={(e) => handleSelectEntity(Number(e), "to")}
                />
              </View>

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
                          onPress={handleSaveTransaction}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <KeyboardSpacer />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 20,
    flexGrow: 1,
    paddingBottom: 150,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    color: "#666",
    textAlign: "center",
  },
  transferContent: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  transferOptions: {
    backgroundColor: "#f0f0f0",
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
  rotateIconTransfer: {
    transform: [{ rotate: "180deg" }],
    transitionDelay: "200ms",
  },
  iconTransfer: {
    marginTop: -8,
  },
});
