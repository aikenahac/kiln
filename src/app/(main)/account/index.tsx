import { useQueries } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { queryKeys } from "@/api/keys";
import { getProject } from "@/api/services/core";
import { Icon } from "@/components/icon";
import { PhaseLamps } from "@/components/phase-lamps";
import { ProjectIcon } from "@/components/project-icon";
import { Chips, SectionTitle } from "@/components/screen-parts";
import { expoUrls } from "@/lib/format";
import {
  preferenceKeys,
  preferences,
  refreshIntervals,
  useFavorites,
  useRefreshInterval,
  type AppearancePreference,
  type RefreshInterval,
} from "@/lib/preferences";
import { useAuth } from "@/providers/auth-provider";
import { queryClient } from "@/providers/query-provider";
import { useKilnTheme } from "@/providers/theme-provider";

const intervalLabels = Object.fromEntries(
  refreshIntervals.map((value) => [String(value), value ? `${value}s` : "Manual"]),
) as Record<string, string>;

function FavoritesSection() {
  const { token, account } = useAuth();
  const { favorites, toggle, setFavorites } = useFavorites();
  const projects = useQueries({
    queries: favorites.map((id) => ({
      queryKey: queryKeys.project(account?.id ?? "none", id),
      enabled: Boolean(token && account),
      queryFn: ({ signal }: { signal: AbortSignal }) => getProject(token!, id, signal),
      staleTime: 60_000,
    })),
  });
  if (!favorites.length)
    return (
      <Text className="px-5 text-[15px] leading-5 text-ink-2 android:px-4">
        No favorites. Star a project in Projects to pin it on Now.
      </Text>
    );
  return (
    <View className="mx-4 overflow-hidden rounded-[26px] bg-raised android:rounded-2xl">
      {favorites.map((id, index) => {
        const project = projects[index]?.data;
        const missing = projects[index]?.isError;
        return (
          <View key={id} className="min-h-[58px] flex-row items-center gap-3 border-b border-rule pl-4 last:border-b-0">
            {project ? <ProjectIcon project={project} size="sm" /> : null}
            <Text className={`flex-1 text-[17px] ${missing ? "text-ink-3" : "text-ink"}`} numberOfLines={1}>
              {project?.name ?? (missing ? "Not on this account" : "Loading")}
            </Text>
            <Pressable
              onPress={() => toggle(id)}
              className="h-12 w-12 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Remove ${project?.name ?? "project"} from favorites`}
            >
              <Icon name="close" size={15} color="ink3" />
            </Pressable>
          </View>
        );
      })}
      <SettingRow title="Clear favorites" danger onPress={() => setFavorites([])} />
    </View>
  );
}

function SettingRow({
  title,
  subtitle,
  value,
  onPress,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="min-h-[58px] gap-0.5 border-b border-rule px-4 py-3 last:border-b-0 active:bg-raised-2"
    >
      <View className="flex-row gap-3">
        <Text
          className={`flex-1 text-[17px] ${danger ? "text-alarm-ink" : "text-ink"}`}
        >
          {title}
        </Text>
        {value ? <Text className="text-[17px] text-ink-2">{value}</Text> : null}
      </View>
      {subtitle ? (
        <Text className="text-[13px] leading-[18px] text-ink-2">
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function AccountScreen() {
  const { actor, account, signOut, testConnection } = useAuth();
  const { appearance, setAppearance } = useKilnTheme();
  const [refreshInterval, setRefreshInterval] = useRefreshInterval();
  const [latency, setLatency] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const test = async () => {
    setTesting(true);
    try {
      setLatency(await testConnection());
    } catch (error) {
      Alert.alert(
        "Connection failed",
        error instanceof Error ? error.message : "Expo could not be reached.",
      );
    } finally {
      setTesting(false);
    }
  };
  const clearCache = () => {
    queryClient.clear();
    preferences.remove(preferenceKeys.recents);
    Alert.alert(
      "Cached data cleared",
      "Kiln will load fresh data as screens open.",
    );
  };
  const replace = async () => {
    await signOut();
  };
  const appearanceValues: AppearancePreference[] = ["system", "dark", "light"];
  return (
    <ScrollView
      className="flex-1 bg-ground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-28 pt-5"
    >
      <View className="gap-2 px-5 android:px-4">
        <Text className="text-[34px] font-bold text-ink android:text-[32px]">
          Account
        </Text>
        <Text className="text-[17px] text-ink">
          {actor?.username ?? actor?.email ?? actor?.firstName ?? "Expo actor"}
        </Text>
        <Text className="text-[15px] text-ink-2">
          {account?.name ?? "No active account"}
        </Text>
        <View className="mt-4">
          <PhaseLamps
            size="row"
            phases={[
              { name: "Token", state: "done", duration: "stored" },
              {
                name: "Connection",
                state: testing ? "live" : latency ? "done" : "off",
                duration: latency ? `${latency} ms` : "test",
              },
              { name: "Notifications", state: "off", duration: "not set" },
            ]}
          />
        </View>
      </View>
      <SectionTitle>Connection</SectionTitle>
      <View className="mx-4 overflow-hidden rounded-[26px] bg-raised android:rounded-2xl">
        <SettingRow
          title="Active account"
          value={account?.name}
          onPress={() => router.push("/accounts")}
        />
        <SettingRow
          title="Connection test"
          value={testing ? "Testing" : latency ? `${latency} ms` : undefined}
          onPress={() => void test()}
        />
        <SettingRow
          title="Replace token"
          subtitle="Validates the new token before saving."
          onPress={() => void replace()}
        />
      </View>
      <SectionTitle>Appearance</SectionTitle>
      <View className="mx-4 flex-row gap-1 rounded-[18px] bg-raised-2 p-1">
        {appearanceValues.map((value) => (
          <Pressable
            key={value}
            onPress={() => setAppearance(value)}
            className={`h-10 flex-1 items-center justify-center rounded-2xl ${appearance === value ? "bg-ink" : ""}`}
          >
            <Text
              className={`font-semibold capitalize ${appearance === value ? "text-ground" : "text-ink-2"}`}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle>Account resources</SectionTitle>
      <View className="mx-4 overflow-hidden rounded-[26px] bg-raised android:rounded-2xl">
        <SettingRow
          title="Devices"
          subtitle="Apple devices registered for internal builds"
          onPress={() => router.push("/(main)/account/devices")}
        />
        <SettingRow
          title="Members"
          subtitle="Read-only list of people and roles"
          onPress={() => router.push("/(main)/account/members")}
        />
        {account ? (
          <SettingRow
            title="Usage and billing"
            subtitle="Opens in Expo. Kiln doesn't read billing."
            onPress={() => void WebBrowser.openBrowserAsync(expoUrls.billing(account.name))}
          />
        ) : null}
      </View>
      <SectionTitle>Refresh</SectionTitle>
      <Chips
        options={refreshIntervals.map(String)}
        value={String(refreshInterval)}
        onChange={(value) => setRefreshInterval(Number(value) as RefreshInterval)}
        labels={intervalLabels}
      />
      <Text className="px-5 pt-2 text-[13px] leading-[18px] text-ink-3 android:px-4">
        Running builds, submissions and workflow runs refresh at this pace while their screen is open and Kiln is in the foreground.
      </Text>
      <SectionTitle>Favorites</SectionTitle>
      <FavoritesSection />
      <SectionTitle>Data</SectionTitle>
      <View className="mx-4 overflow-hidden rounded-[26px] bg-raised android:rounded-2xl">
        <SettingRow title="Clear cached data" subtitle="Responses live in memory only. This drops them and recent projects." onPress={clearCache} />
        <SettingRow
          title="Notifications"
          value="Set up"
          subtitle="Needs a Kiln server you run. Not set up."
          onPress={() =>
            Alert.alert(
              "Notifications",
              "Needs a Kiln server you run. Not set up. Foreground polling stops when Kiln is not active.",
            )
          }
        />
      </View>
      <SectionTitle>About</SectionTitle>
      <View className="mx-4 overflow-hidden rounded-[26px] bg-raised android:rounded-2xl">
        <SettingRow
          title="Kiln"
          value={Constants.expoConfig?.version ?? "1.0.0"}
          subtitle="Unofficial client. Not affiliated with Expo."
        />
        <SettingRow
          title="Sign out"
          danger
          onPress={() =>
            Alert.alert(
              "Sign out?",
              "The token, encryption key and account cache will be removed from this device.",
              [
                { text: "Keep session", style: "cancel" },
                {
                  text: "Sign out",
                  style: "destructive",
                  onPress: () => void signOut(),
                },
              ],
            )
          }
        />
      </View>
    </ScrollView>
  );
}
