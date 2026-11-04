import "@/global.css";

import { Stack } from "expo-router";

import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import {
  KilnThemeProvider,
  palette,
  useKilnTheme,
} from "@/providers/theme-provider";

function Navigator() {
  const { isDark } = useKilnTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? palette.dark.ground : palette.light.ground,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="accounts"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.9],
          headerShown: true,
          title: "Accounts",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <KilnThemeProvider>
        <AuthProvider>
          <Navigator />
        </AuthProvider>
      </KilnThemeProvider>
    </QueryProvider>
  );
}
