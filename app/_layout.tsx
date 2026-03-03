import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { en, registerTranslation } from "react-native-paper-dates";
import { useMovementsStore } from "@/store/movementsStore";
import { LoadingScreen } from "@/components/LoadingScreen";

registerTranslation("en", en);

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const isHydrated = useMovementsStore((state) => state.isHydrated);

  if (!loaded) {
    return null;
  }

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
