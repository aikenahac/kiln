import { Stack } from "expo-router";

import { detailScreens, TabStack } from "@/components/tab-stack";

export default function ProjectsStack() {
  return (
    <TabStack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
      <Stack.Screen name="[id]/builds" options={{ title: "Builds", headerLargeTitle: true }} />
      <Stack.Screen
        name="[id]/submissions"
        options={{ title: "Submissions", headerLargeTitle: true }}
      />
      <Stack.Screen name="[id]/updates" options={{ title: "Updates", headerLargeTitle: true }} />
      <Stack.Screen name="[id]/channels" options={{ title: "Channels", headerLargeTitle: true }} />
      <Stack.Screen name="[id]/branches" options={{ title: "Branches", headerLargeTitle: true }} />
      <Stack.Screen name="[id]/workflows" options={{ title: "Workflows", headerLargeTitle: true }} />
      <Stack.Screen
        name="[id]/environment"
        options={{ title: "Environment variables", headerLargeTitle: true }}
      />
      <Stack.Screen name="[id]/hosting" options={{ title: "Hosting", headerLargeTitle: true }} />
      {detailScreens()}
    </TabStack>
  );
}
