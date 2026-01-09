import AsyncStorage from "@react-native-async-storage/async-storage";

const MOVEMENTS_KEY = "movements";
const ENTITIES_KEY = "entities";

export const saveMovements = async (movements: any[]) => {
  try {
    await AsyncStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  } catch (error) {
    console.error("Error saving movements:", error);
  }
};

export const loadMovements = async (): Promise<any[]> => {
  try {
    const data = await AsyncStorage.getItem(MOVEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading movements:", error);
    return [];
  }
};

export const saveEntities = async (entities: any[]) => {
  try {
    await AsyncStorage.setItem(ENTITIES_KEY, JSON.stringify(entities));
  } catch (error) {
    console.error("Error saving entities:", error);
  }
};

export const loadEntities = async (): Promise<any[]> => {
  try {
    const data = await AsyncStorage.getItem(ENTITIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading entities:", error);
    return [];
  }
};
