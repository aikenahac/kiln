import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { ActivityIndicator, View } from "react-native";

import { palette, useKilnTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";

export default function MainTabsLayout() {
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
  if (state === "signedOut") return <Redirect href="/(auth)/sign-in" />;
  return (
    <NativeTabs
      tintColor={colors.ink}
      backgroundColor={colors.ground}
      indicatorColor={colors.raised}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="now">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "gauge.open.with.lines.needle.33percent",
            selected:
              "gauge.open.with.lines.needle.67percent.and.arrowtriangle",
          }}
          md="speed"
        />
        <NativeTabs.Trigger.Label>Now</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="projects">
        <NativeTabs.Trigger.Icon
          sf={{ default: "folder", selected: "folder.fill" }}
          md="folder"
        />
        <NativeTabs.Trigger.Label>Projects</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "clock.arrow.circlepath",
            selected: "clock.arrow.circlepath",
          }}
          md="history"
        />
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.circle", selected: "person.circle.fill" }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
