import AsyncStorage from "@react-native-async-storage/async-storage";
import { IMovement } from "@/types/movements";
import { IEntity } from "@/types/entities";

const MOVEMENTS_KEY = "movements";
const ENTITIES_KEY = "entities";
const SCHEMA_VERSION = 2;

interface PersistedMovements {
  schemaVersion: number;
  data: IMovement[];
}

function migrateMovements(raw: any[]): IMovement[] {
  return raw.map((m: any) => {
    let amount: number;
    if (typeof m.amount === "string") {
      const cleaned = m.amount.replace(/\./g, "");
      amount = parseInt(cleaned) || 0;
    } else {
      amount = m.amount;
    }

    const dateIso = new Date(m.date).toISOString();

    return {
      ...m,
      id: String(m.id),
      amount,
      date: new Date(m.date),
      createdAt: m.createdAt ?? dateIso,
      updatedAt: m.updatedAt ?? dateIso,
    };
  });
}

function reviveDates(movements: any[]): IMovement[] {
  return movements.map((m: any) => ({
    ...m,
    date: new Date(m.date),
  }));
}

export const saveMovements = async (movements: IMovement[]) => {
  try {
    const payload: PersistedMovements = {
      schemaVersion: SCHEMA_VERSION,
      data: movements,
    };
    await AsyncStorage.setItem(MOVEMENTS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Error saving movements:", error);
  }
};

export const loadMovements = async (): Promise<IMovement[]> => {
  try {
    const raw = await AsyncStorage.getItem(MOVEMENTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // Legacy format: plain array (no schemaVersion)
    if (Array.isArray(parsed)) {
      const migrated = migrateMovements(parsed);
      await saveMovements(migrated);
      return migrated;
    }

    const persisted = parsed as PersistedMovements;

    if (persisted.schemaVersion < SCHEMA_VERSION) {
      const migrated = migrateMovements(persisted.data);
      await saveMovements(migrated);
      return migrated;
    }

    return reviveDates(persisted.data);
  } catch (error) {
    console.error("Error loading movements:", error);
    return [];
  }
};

export const saveEntities = async (entities: IEntity[]) => {
  try {
    await AsyncStorage.setItem(ENTITIES_KEY, JSON.stringify(entities));
  } catch (error) {
    console.error("Error saving entities:", error);
  }
};

export const loadEntities = async (): Promise<IEntity[]> => {
  try {
    const data = await AsyncStorage.getItem(ENTITIES_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // Strip total_amount if present from legacy data
    return parsed.map(({ total_amount, ...rest }: any) => rest);
  } catch (error) {
    console.error("Error loading entities:", error);
    return [];
  }
};
