import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { en, registerTranslation } from "react-native-paper-dates";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getDatabaseInstance } from "@/storage/database";
import { runSQLiteMigrations } from "@/storage/migrations/sqliteMigrationRunner";
import { AuthGate } from "@/components/AuthGate";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useRecurringDebtsStore } from "@/store/recurringDebtsStore";
import { useBudgetsStore } from "@/store/budgetsStore";
import { useGoalsStore } from "@/store/goalsStore";

registerTranslation("en", en);

function MigrationErrorScreen({ error }: { error: Error }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Startup Error</Text>
      <Text style={styles.errorMessage}>
        A data migration failed and the app cannot start safely. Please
        reinstall the app to resolve this issue.
      </Text>
      <Text style={styles.errorDetail}>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [migrationsDone, setMigrationsDone] = useState(false);
  const [migrationError, setMigrationError] = useState<Error | null>(null);

  useEffect(() => {
    getDatabaseInstance()
      .then((db) => runSQLiteMigrations(db))
      .then(async () => {
        setMigrationsDone(true);
        // Hydrate stores and run recurring debts scheduler
        await Promise.all([
          useBudgetsStore.getState().hydrate(),
          useGoalsStore.getState().hydrate(),
          useRecurringDebtsStore.getState().hydrate(),
        ]);
        await useRecurringDebtsStore.getState().checkAndPostDueDebts();
      })
      .catch((err) =>
        setMigrationError(
          err instanceof Error ? err : new Error(String(err))
        )
      );
  }, []);

  if (!loaded) {
    return null;
  }

  if (migrationError) {
    return <MigrationErrorScreen error={migrationError} />;
  }

  if (!migrationsDone) {
    return <LoadingScreen message="Updating your data..." />;
  }

  return (
    <AuthGate>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#cc0000",
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  errorDetail: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontFamily: "SpaceMono",
  },
});
