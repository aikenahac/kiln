import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/providers/auth-provider";
import { palette, useKilnTheme } from "@/providers/theme-provider";

export default function AuthLayout() {
  const { state } = useAuth();
  const { isDark } = useKilnTheme();
  if (state === "loading") {
    const colors = isDark ? palette.dark : palette.light;
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.ground,
        }}
      >
        <ActivityIndicator color={colors.live} />
      </View>
    );
  }
  if (state === "signedIn") return <Redirect href="/(main)/now" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
