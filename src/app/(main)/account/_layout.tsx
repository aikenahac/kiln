import { Stack } from "expo-router";

import { TabStack } from "@/components/tab-stack";

export default function AccountStack() {
  return (
    <TabStack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="devices" options={{ title: "Devices", headerLargeTitle: true }} />
      <Stack.Screen name="members" options={{ title: "Members", headerLargeTitle: true }} />
    </TabStack>
  );
}
