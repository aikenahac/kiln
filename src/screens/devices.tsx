import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
import { Alert, Share, Text, TextInput, View } from "react-native";

import { errorCopy } from "@/api/errors";
import { useAppleDevices, useDeviceActions } from "@/api/hooks/use-account";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { Icon, type IconName } from "@/components/icon";
import { ResourceList } from "@/components/resource-list";
import { Button, Chips, Note } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { relativeTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { usePalette } from "@/providers/theme-provider";
import type { AppleDevice, AppleDeviceClass } from "@/types/api";

const filters = ["All", "iPhone", "iPad", "Mac"] as const;
type Filter = (typeof filters)[number];
const classFilter: Record<Filter, AppleDeviceClass | undefined> = {
  All: undefined,
  iPhone: "IPHONE",
  iPad: "IPAD",
  Mac: "MAC",
};
const classIcon: Record<AppleDeviceClass, IconName> = {
  IPHONE: "phone",
  IPAD: "tablet",
  MAC: "mac",
  UNKNOWN: "phone",
};
const classWord: Record<AppleDeviceClass, string> = {
  IPHONE: "iPhone",
  IPAD: "iPad",
  MAC: "Mac",
  UNKNOWN: "Device",
};

type Edit =
  | { kind: "rename"; device: AppleDevice; name: string }
  | { kind: "delete"; device: AppleDevice }
  | { kind: "register"; teamId?: string; url?: string };

export default function DevicesScreen() {
  const { account } = useAuth();
  const [filter, setFilter] = useState<Filter>("All");
  const query = useAppleDevices(classFilter[filter]);
  const actions = useDeviceActions();
  const colors = usePalette();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState<string>();
  const devices = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const teams = query.data?.pages[0]?.teams ?? [];
  const teamName = (device: AppleDevice) =>
    device.appleTeam.appleTeamName ?? device.appleTeam.appleTeamIdentifier;

  const close = () => {
    setEdit(null);
    setError(undefined);
  };

  const sheet = (() => {
    if (!edit) return null;
    switch (edit.kind) {
      case "rename":
        return {
          title: "Rename device",
          scope: [
            { label: "Account", value: account?.name ?? "" },
            { label: "UDID", value: edit.device.identifier },
          ],
          visual: (
            <TextInput
              value={edit.name}
              onChangeText={(name) => setEdit({ ...edit, name })}
              placeholder="Device name"
              placeholderTextColor={colors.ink2}
              autoFocus
              className="h-12 rounded-field bg-raised-2 px-4 text-[17px] text-ink"
            />
          ),
          confirmLabel: "Rename",
          disabled: !edit.name.trim(),
          pending: actions.rename.isPending,
          onConfirm: () =>
            actions.rename.mutate(
              { id: edit.device.id, name: edit.name.trim() },
              { onSuccess: close, onError: (failure) => setError(errorCopy(failure)) },
            ),
        };
      case "delete":
        return {
          title: `Remove ${edit.device.name ?? "this device"}?`,
          body: "Expo forgets the device. It stays registered with Apple until you disable it in the Apple Developer portal, and existing ad hoc builds keep working on it.",
          scope: [
            { label: "Account", value: account?.name ?? "" },
            { label: "Apple team", value: teamName(edit.device) },
            { label: "UDID", value: edit.device.identifier },
          ],
          confirmLabel: "Remove device",
          destructive: true,
          pending: actions.remove.isPending,
          onConfirm: () =>
            actions.remove.mutate(edit.device.id, {
              onSuccess: close,
              onError: (failure) => setError(errorCopy(failure)),
            }),
        };
      case "register":
        return {
          title: "Register a device",
          body: edit.url
            ? "Open this link on the iPhone or iPad to register. It installs a profile that sends the device's UDID to Expo. Rebuild internal builds afterwards so they include it."
            : "Expo creates a registration link for one Apple team. Open it on the device you want to add.",
          scope: [{ label: "Account", value: account?.name ?? "" }],
          visual: edit.url ? (
            <View className="gap-3">
              <Text className="rounded-field bg-raised-2 p-4 font-mono text-[14px] text-ink" selectable>
                {edit.url}
              </Text>
              <Button label="Copy link" onPress={() => void Clipboard.setStringAsync(edit.url!)} />
              <Button label="Share link" onPress={() => void Share.share({ message: edit.url! })} />
            </View>
          ) : teams.length ? (
            <View className="overflow-hidden rounded-[22px] bg-raised android:rounded-2xl">
              {teams.map((team) => (
                <StatusRow
                  key={team.id}
                  title={team.appleTeamName ?? team.appleTeamIdentifier}
                  subtitle={team.appleTeamIdentifier}
                  trailing={edit.teamId === team.id ? <Icon name="check" size={16} color="ink" /> : undefined}
                  onPress={() => setEdit({ ...edit, teamId: team.id })}
                />
              ))}
            </View>
          ) : (
            <Text className="text-[15px] text-ink-2">
              No Apple team is linked to this account yet. Run eas device:create once, or set up iOS credentials with eas credentials.
            </Text>
          ),
          confirmLabel: edit.url ? "Done" : "Create link",
          disabled: !edit.url && !edit.teamId,
          pending: actions.register.isPending,
          onConfirm: () =>
            edit.url
              ? close()
              : actions.register.mutate(edit.teamId!, {
                  onSuccess: (url) => setEdit({ ...edit, url }),
                  onError: (failure) => setError(errorCopy(failure)),
                }),
        };
    }
  })();

  return (
    <>
      <ResourceList
        data={devices}
        keyExtractor={(device) => device.id}
        query={query}
        header={
          <>
            <Chips options={filters} value={filter} onChange={setFilter} />
            <Note>
              Apple devices registered for internal distribution on this account. Android builds install without registration.
            </Note>
          </>
        }
        empty={{
          title: "No devices",
          body: "Register an iPhone or iPad to install internal iOS builds on it.",
        }}
        footer={
          <View className="px-5 pt-4 android:px-4">
            <Button label="Register a device" variant="primary" onPress={() => setEdit({ kind: "register", teamId: teams.length === 1 ? teams[0]!.id : undefined })} />
          </View>
        }
        renderItem={(device) => {
          const deviceClass = device.deviceClass ?? "UNKNOWN";
          return (
            <StatusRow
              leading={
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-raised-2">
                  <Icon name={classIcon[deviceClass]} size={20} color="ink" />
                </View>
              }
              title={device.name ?? classWord[deviceClass]}
              subtitle={[
                device.model ?? classWord[deviceClass],
                device.softwareVersion ? `iOS ${device.softwareVersion}` : undefined,
                teamName(device),
                device.enabled === false ? "disabled" : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
              meta={relativeTime(device.createdAt)}
              onPress={() =>
                Alert.alert(device.name ?? classWord[deviceClass], device.identifier, [
                  { text: "Copy UDID", onPress: () => void Clipboard.setStringAsync(device.identifier) },
                  { text: "Rename", onPress: () => setEdit({ kind: "rename", device, name: device.name ?? "" }) },
                  { text: "Remove from Expo", style: "destructive", onPress: () => setEdit({ kind: "delete", device }) },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            />
          );
        }}
      />
      {sheet ? (
        <ConfirmSheet
          visible
          title={sheet.title}
          body={"body" in sheet ? sheet.body : undefined}
          scope={sheet.scope}
          visual={"visual" in sheet ? sheet.visual : undefined}
          confirmLabel={sheet.confirmLabel}
          safeLabel={edit?.kind === "register" && edit.url ? "Close" : "Keep as is"}
          destructive={"destructive" in sheet ? sheet.destructive : false}
          disabled={"disabled" in sheet ? sheet.disabled : false}
          pending={sheet.pending}
          error={error}
          onConfirm={sheet.onConfirm}
          onClose={close}
        />
      ) : null}
    </>
  );
}
