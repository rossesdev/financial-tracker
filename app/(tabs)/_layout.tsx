import { Tabs } from "expo-router";
import React from "react";
import { Platform, Text } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Header } from "@react-navigation/elements";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        header: ({ options, route }) => (
          <Header
            title={options?.title || route?.name || "Financial Track"}
            headerLeft={() => <Text style={{ marginLeft: 10 }}>Rose</Text>}
          />
        ),
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,

        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="movement"
        options={{
          title: "Add Movement",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="transaction"
        options={{
          title: "Transaction",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="arrow.right.arrow.left.circle"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
