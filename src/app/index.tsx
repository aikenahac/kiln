import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/providers/auth-provider";
import { palette, useKilnTheme } from "@/providers/theme-provider";

export default function IndexScreen() {
  const { state } = useAuth();
  const { isDark } = useKilnTheme();
  const colors = isDark ? palette.dark : palette.light;

  if (state === "loading") {
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

  return (
    <Redirect
      href={state === "signedIn" ? "/(main)/now" : "/(auth)/sign-in"}
    />
  );
}
