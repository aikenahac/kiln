import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { StatusRow } from "@/components/status-row";
import { EmptyState } from "@/components/screen-parts";
import { useAuth } from "@/providers/auth-provider";

export default function AccountsScreen() {
  const { actor, account, selectAccount } = useAuth();
  if (!actor?.accounts.length)
    return (
      <EmptyState
        title="No accounts found"
        body="This token is valid but cannot see an Expo account. Check its restrictions in Expo."
      />
    );
  return (
    <ScrollView
      className="flex-1 bg-ground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-10 pt-2"
    >
      {actor.accounts.map((item) => {
        const permissions =
          item.viewerUserPermission2?.effectivePermissions ?? [];
        const owner = item.ownerUserActor?.username === item.name;
        return (
          <StatusRow
            key={item.id}
            title={item.name}
            subtitle={`${owner ? "Personal account" : "Organization"} · ${permissions.length ? `${permissions.length} permissions` : "restricted token"}`}
            status={item.id === account?.id ? "live" : "done"}
            onPress={() => {
              selectAccount(item);
              router.back();
            }}
            trailing={
              item.id === account?.id ? (
                <View className="rounded-full bg-raised-2 px-2 py-1">
                  <Text className="text-xs text-ink-2">Active</Text>
                </View>
              ) : null
            }
          />
        );
      })}
    </ScrollView>
  );
}
