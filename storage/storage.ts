import AsyncStorage from "@react-native-async-storage/async-storage";

const MOVEMENTS_KEY = "movements";

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
