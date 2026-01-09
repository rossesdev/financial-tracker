import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
// Registrar locales para react-native-paper-dates
import { en, registerTranslation } from "react-native-paper-dates";

import { EntitiesProvider } from "@/context/EntitiesContext";
import { MovementsProvider } from "@/context/MovementsContext";

registerTranslation("en", en);

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <EntitiesProvider>
        <MovementsProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </MovementsProvider>
      </EntitiesProvider>
    </ThemeProvider>
  );
}
