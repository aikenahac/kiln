import { Stack } from "expo-router";

import { detailScreens, TabStack } from "@/components/tab-stack";

export default function NowStack() {
  return (
    <TabStack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {detailScreens()}
    </TabStack>
  );
}
