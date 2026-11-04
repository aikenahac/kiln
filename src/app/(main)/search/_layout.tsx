import { Stack } from "expo-router";
import { palette, useKilnTheme } from "@/providers/theme-provider";
export default function SearchStack() {
  const { isDark } = useKilnTheme();
  const colors = isDark ? palette.dark : palette.light;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.ink,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Search" }} />
    </Stack>
  );
}
