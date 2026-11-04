import { Stack } from "expo-router";
import type { PropsWithChildren } from "react";

import { usePalette } from "@/providers/theme-provider";

/** Screens every detail-capable tab stack mounts (see lib/routes.ts). */
export function detailScreens() {
  return [
    <Stack.Screen key="build" name="build/[id]" options={{ title: "Build" }} />,
    <Stack.Screen key="build-logs" name="build/[id]/logs" options={{ title: "Logs" }} />,
    <Stack.Screen key="submission" name="submission/[id]" options={{ title: "Submission" }} />,
    <Stack.Screen
      key="submission-logs"
      name="submission/[id]/logs"
      options={{ title: "Logs" }}
    />,
    <Stack.Screen key="run" name="run/[id]" options={{ title: "Workflow run" }} />,
    <Stack.Screen key="job" name="run/[id]/job/[jobId]" options={{ title: "Job" }} />,
    <Stack.Screen key="update" name="update/[id]" options={{ title: "Update" }} />,
  ];
}

export function TabStack({ children }: PropsWithChildren) {
  const colors = usePalette();
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.ink,
        headerTitleStyle: { color: colors.ink },
        contentStyle: { backgroundColor: colors.ground },
      }}
    >
      {children}
    </Stack>
  );
}
