import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { errorCopy } from "@/api/errors";
import { useProject } from "@/api/hooks/use-projects";
import { useBranches, useChannelActions, useChannels } from "@/api/hooks/use-updates";
import { ConfirmSheet, type ConfirmScope } from "@/components/confirm-sheet";
import { ResourceList } from "@/components/resource-list";
import { Button, Note } from "@/components/screen-parts";
import { SplitBar } from "@/components/split-bar";
import {
  mappingSegments,
  parseChannelMapping,
  rolloutMapping,
  singleMapping,
  type ChannelMapping,
} from "@/lib/branch-mapping";
import { relativeTime } from "@/lib/format";
import { usePalette } from "@/providers/theme-provider";
import type { Branch, Channel } from "@/types/api";

type Edit =
  | { kind: "rollout"; channel: Channel; mapping: Extract<ChannelMapping, { kind: "rollout" }>; percent: number }
  | { kind: "start"; channel: Channel; fromBranchId: string; branchId?: string; percent: number }
  | { kind: "point"; channel: Channel; branchId?: string }
  | { kind: "finish"; channel: Channel; mapping: Extract<ChannelMapping, { kind: "rollout" }>; keep: "rolledOut" | "default" }
  | { kind: "pause"; channel: Channel }
  | { kind: "delete"; channel: Channel }
  | { kind: "create"; name: string; branchId?: string };

const PRESETS = [1, 5, 10, 25, 50, 75, 100];

function BranchPicker({
  branches,
  value,
  exclude,
  onChange,
}: {
  branches: Branch[];
  value?: string;
  exclude?: string;
  onChange: (id: string) => void;
}) {
  return (
    <View className="overflow-hidden rounded-[22px] bg-raised android:rounded-2xl">
      {branches
        .filter((branch) => branch.id !== exclude)
        .map((branch) => (
          <Pressable
            key={branch.id}
            onPress={() => onChange(branch.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === branch.id }}
            className="min-h-[52px] flex-row items-center gap-3 border-b border-rule px-4 py-2 last:border-b-0 active:bg-raised-2"
          >
            <View
              className={`h-4 w-4 rounded-full border-2 ${value === branch.id ? "border-ink bg-ink" : "border-ink-3"}`}
            />
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-ink">{branch.name}</Text>
              <Text className="text-[13px] text-ink-2" numberOfLines={1}>
                {branch.latestUpdate
                  ? `${branch.latestUpdate.message ?? "No message"} · ${relativeTime(branch.latestUpdate.createdAt)}`
                  : "No updates"}
              </Text>
            </View>
          </Pressable>
        ))}
    </View>
  );
}

function PercentPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        {[-10, -1].map((delta) => (
          <Pressable
            key={delta}
            onPress={() => onChange(Math.max(0, value + delta))}
            className="h-11 flex-1 items-center justify-center rounded-full bg-raised-2"
            accessibilityLabel={`Decrease by ${-delta} percent`}
          >
            <Text className="text-[15px] font-semibold text-ink">{delta}</Text>
          </Pressable>
        ))}
        {[1, 10].map((delta) => (
          <Pressable
            key={delta}
            onPress={() => onChange(Math.min(100, value + delta))}
            className="h-11 flex-1 items-center justify-center rounded-full bg-raised-2"
            accessibilityLabel={`Increase by ${delta} percent`}
          >
            <Text className="text-[15px] font-semibold text-ink">+{delta}</Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Pressable
            key={preset}
            onPress={() => onChange(preset)}
            className={`h-9 items-center justify-center rounded-full px-3 ${preset === value ? "bg-ink" : "bg-raised-2"}`}
          >
            <Text
              className={`text-[14px] font-semibold ${preset === value ? "text-ground" : "text-ink"}`}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {preset}%
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ProjectChannelsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const channels = useChannels(id);
  const branches = useBranches(id);
  const actions = useChannelActions(id);
  const colors = usePalette();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState<string>();

  const branchList = useMemo(() => branches.data ?? [], [branches.data]);
  const branchName = useMemo(() => {
    const names = new Map<string, string>();
    for (const branch of branchList) names.set(branch.id, branch.name);
    for (const channel of channels.data ?? [])
      for (const branch of channel.updateBranches) names.set(branch.id, branch.name);
    return (branchId: string) => names.get(branchId) ?? "Unknown branch";
  }, [branchList, channels.data]);

  const close = () => {
    setEdit(null);
    setError(undefined);
  };

  const openActions = (channel: Channel) => {
    const mapping = parseChannelMapping(channel.branchMapping);
    const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (mapping.kind === "rollout") {
      options.push({
        text: "Change rollout",
        onPress: () => setEdit({ kind: "rollout", channel, mapping, percent: mapping.percent }),
      });
      options.push({
        text: `Finish on ${branchName(mapping.rolledOutBranchId)}`,
        onPress: () => setEdit({ kind: "finish", channel, mapping, keep: "rolledOut" }),
      });
      options.push({
        text: `Roll back to ${branchName(mapping.defaultBranchId)}`,
        onPress: () => setEdit({ kind: "finish", channel, mapping, keep: "default" }),
      });
    }
    if (mapping.kind === "single") {
      options.push({
        text: "Start a rollout",
        onPress: () =>
          setEdit({ kind: "start", channel, fromBranchId: mapping.branchId, percent: 10 }),
      });
    }
    if (mapping.kind === "single" || mapping.kind === "empty") {
      options.push({
        text: "Point to another branch",
        onPress: () => setEdit({ kind: "point", channel }),
      });
    }
    options.push({
      text: channel.isPaused ? "Resume updates" : "Pause updates",
      onPress: () => setEdit({ kind: "pause", channel }),
    });
    options.push({
      text: "Delete channel",
      style: "destructive",
      onPress: () => setEdit({ kind: "delete", channel }),
    });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert(
      channel.name,
      mapping.kind === "custom"
        ? "This channel uses a custom mapping. Kiln can pause or delete it; edit the mapping in Expo or with eas channel:edit."
        : undefined,
      mapping.kind === "custom"
        ? options.filter((option) => !option.text.startsWith("Point"))
        : options,
    );
  };

  const projectLabel = project.data
    ? `${project.data.ownerAccount.name} / ${project.data.slug}`
    : "This project";

  const sheet = (() => {
    if (!edit) return null;
    const run = (promise: Promise<unknown>) =>
      promise.then(close, (failure: unknown) => setError(errorCopy(failure)));
    const channelScope = (channel: Channel): ConfirmScope => [
      { label: "Project", value: projectLabel },
      { label: "Channel", value: `${channel.name}${channel.isProtected ? " · protected" : ""}` },
    ];
    switch (edit.kind) {
      case "rollout": {
        const { mapping, channel, percent } = edit;
        const next = { ...mapping, percent };
        return {
          title: `Roll out ${branchName(mapping.rolledOutBranchId)}`,
          body: `Users on ${channel.name} get ${branchName(mapping.rolledOutBranchId)} by a stable per-device hash. The rest stay on ${branchName(mapping.defaultBranchId)}.${mapping.runtimeVersion ? ` Only runtime ${mapping.runtimeVersion} is affected.` : ""}`,
          scope: [
            ...channelScope(channel),
            { label: "Branch", value: branchName(mapping.rolledOutBranchId) },
          ],
          before: `${mapping.percent}%`,
          after: `${percent}%`,
          visual: (
            <View className="gap-5">
              <SplitBar
                size="hero"
                segments={mappingSegments(next, branchName)}
                deltaFrom={mapping.percent}
              />
              <PercentPicker
                value={percent}
                onChange={(value) => setEdit({ ...edit, percent: value })}
              />
            </View>
          ),
          confirmLabel: `Set rollout to ${percent}%`,
          disabled: percent === mapping.percent,
          onConfirm: () =>
            run(
              actions.editMapping.mutateAsync({
                channelId: channel.id,
                branchMapping: rolloutMapping(next),
              }),
            ),
        };
      }
      case "start": {
        const { channel, fromBranchId, branchId, percent } = edit;
        return {
          title: "Start a rollout",
          body: `Pick the branch to roll out on ${channel.name}. Everyone else stays on ${branchName(fromBranchId)}.`,
          scope: [...channelScope(channel), { label: "Now on", value: branchName(fromBranchId) }],
          before: "0%",
          after: `${percent}%`,
          visual: (
            <View className="gap-5">
              <BranchPicker
                branches={branchList}
                value={branchId}
                exclude={fromBranchId}
                onChange={(value) => setEdit({ ...edit, branchId: value })}
              />
              {branchId ? (
                <SplitBar
                  size="hero"
                  segments={mappingSegments(
                    { kind: "rollout", rolledOutBranchId: branchId, defaultBranchId: fromBranchId, percent },
                    branchName,
                  )}
                  deltaFrom={0}
                />
              ) : null}
              <PercentPicker value={percent} onChange={(value) => setEdit({ ...edit, percent: value })} />
            </View>
          ),
          confirmLabel: branchId ? `Roll out ${branchName(branchId)} to ${percent}%` : "Pick a branch",
          disabled: !branchId || percent === 0,
          onConfirm: () =>
            branchId &&
            run(
              actions.editMapping.mutateAsync({
                channelId: channel.id,
                branchMapping: rolloutMapping({
                  rolledOutBranchId: branchId,
                  defaultBranchId: fromBranchId,
                  percent,
                }),
              }),
            ),
        };
      }
      case "point": {
        const { channel, branchId } = edit;
        const current = parseChannelMapping(channel.branchMapping);
        const currentId = current.kind === "single" ? current.branchId : undefined;
        return {
          title: `Point ${channel.name} to a branch`,
          body: "Every user on this channel gets the chosen branch's latest compatible update on next launch.",
          scope: channelScope(channel),
          before: currentId ? branchName(currentId) : "none",
          after: branchId ? branchName(branchId) : "…",
          visual: (
            <BranchPicker
              branches={branchList}
              value={branchId}
              exclude={currentId}
              onChange={(value) => setEdit({ ...edit, branchId: value })}
            />
          ),
          confirmLabel: branchId ? `Point to ${branchName(branchId)}` : "Pick a branch",
          disabled: !branchId,
          onConfirm: () =>
            branchId &&
            run(
              actions.editMapping.mutateAsync({
                channelId: channel.id,
                branchMapping: singleMapping(branchId),
              }),
            ),
        };
      }
      case "finish": {
        const { channel, mapping, keep } = edit;
        const target = keep === "rolledOut" ? mapping.rolledOutBranchId : mapping.defaultBranchId;
        const targetPercent = keep === "rolledOut" ? 100 : 0;
        return {
          title: keep === "rolledOut" ? "Finish rollout" : "Roll back",
          body:
            keep === "rolledOut"
              ? `All users on ${channel.name} move to ${branchName(target)}.`
              : `All users on ${channel.name} return to ${branchName(target)}.`,
          scope: [...channelScope(channel), { label: "Branch", value: branchName(mapping.rolledOutBranchId) }],
          before: `${mapping.percent}%`,
          after: `${targetPercent}%`,
          visual: (
            <SplitBar
              size="hero"
              segments={mappingSegments({ ...mapping, percent: targetPercent }, branchName)}
              deltaFrom={mapping.percent}
            />
          ),
          confirmLabel: keep === "rolledOut" ? `Move everyone to ${branchName(target)}` : `Roll back to ${branchName(target)}`,
          destructive: keep === "default",
          onConfirm: () =>
            run(
              actions.editMapping.mutateAsync({
                channelId: channel.id,
                branchMapping: singleMapping(target),
              }),
            ),
        };
      }
      case "pause":
        return {
          title: edit.channel.isPaused ? `Resume ${edit.channel.name}` : `Pause ${edit.channel.name}`,
          body: edit.channel.isPaused
            ? "Devices on this channel start receiving new updates again."
            : "Devices on this channel stop receiving new updates until you resume it. Installed updates stay.",
          scope: channelScope(edit.channel),
          confirmLabel: edit.channel.isPaused ? "Resume updates" : "Pause updates",
          destructive: !edit.channel.isPaused,
          onConfirm: () =>
            run(
              actions.setPaused.mutateAsync({
                channelId: edit.channel.id,
                paused: !edit.channel.isPaused,
              }),
            ),
        };
      case "delete":
        return {
          title: `Delete ${edit.channel.name}?`,
          body: "Builds that point at this channel stop receiving updates. Expo schedules the deletion; it can't be undone.",
          scope: channelScope(edit.channel),
          confirmLabel: "Delete channel",
          destructive: true,
          onConfirm: () => run(actions.deleteChannel.mutateAsync(edit.channel.id)),
        };
      case "create":
        return {
          title: "New channel",
          body: "Builds pick a channel at build time. A new channel serves nothing until a build uses it.",
          scope: [{ label: "Project", value: projectLabel }],
          visual: (
            <View className="gap-4">
              <TextInput
                value={edit.name}
                onChangeText={(name) => setEdit({ ...edit, name })}
                placeholder="Channel name"
                placeholderTextColor={colors.ink2}
                autoCapitalize="none"
                autoCorrect={false}
                className="h-12 rounded-field bg-raised-2 px-4 text-[17px] text-ink"
              />
              <BranchPicker
                branches={branchList}
                value={edit.branchId}
                onChange={(branchId) => setEdit({ ...edit, branchId })}
              />
            </View>
          ),
          confirmLabel: "Create channel",
          disabled: !edit.name.trim() || !edit.branchId,
          onConfirm: () =>
            edit.branchId &&
            run(
              actions.createChannel.mutateAsync({
                name: edit.name.trim(),
                branchMapping: singleMapping(edit.branchId),
              }),
            ),
        };
    }
  })();

  const pending =
    actions.editMapping.isPending ||
    actions.setPaused.isPending ||
    actions.deleteChannel.isPending ||
    actions.createChannel.isPending;

  return (
    <>
      <ResourceList
        data={channels.data ?? []}
        keyExtractor={(channel) => channel.id}
        query={channels}
        header={
          <Note>
            Tap a channel to change its branch or rollout. Every change is confirmed with its exact before and after.
          </Note>
        }
        empty={{
          title: "No channels",
          body: "Create one here or with eas channel:create, then build with it.",
        }}
        footer={
          <View className="px-5 pt-4 android:px-4">
            <Button label="New channel" onPress={() => setEdit({ kind: "create", name: "" })} />
          </View>
        }
        renderItem={(channel) => {
          const mapping = parseChannelMapping(channel.branchMapping);
          return (
            <Pressable
              onPress={() => openActions(channel)}
              accessibilityRole="button"
              accessibilityHint="Shows actions for this channel"
              className="gap-3 border-b border-rule px-5 py-4 active:bg-raised-2 android:px-4"
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-[17px] font-semibold text-ink">{channel.name}</Text>
                {channel.isProtected ? (
                  <Text className="rounded-full bg-raised-2 px-2 py-0.5 text-[12px] font-semibold text-ink-2">
                    Protected
                  </Text>
                ) : null}
                {channel.isPaused ? (
                  <Text className="rounded-full bg-alarm/10 px-2 py-0.5 text-[12px] font-semibold text-alarm-ink">
                    Paused
                  </Text>
                ) : null}
              </View>
              {mapping.kind === "custom" ? (
                <Text className="text-[13px] text-ink-2">
                  Custom mapping across {mapping.branchIds.length} branches. View it in Expo.
                </Text>
              ) : (
                <SplitBar segments={mappingSegments(mapping, branchName)} />
              )}
              {mapping.kind === "rollout" && mapping.runtimeVersion ? (
                <Text className="text-[13px] text-ink-3">Rollout limited to runtime {mapping.runtimeVersion}</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
      {sheet ? (
        <ConfirmSheet
          visible
          title={sheet.title}
          body={sheet.body}
          scope={sheet.scope}
          before={"before" in sheet ? sheet.before : undefined}
          after={"after" in sheet ? sheet.after : undefined}
          visual={"visual" in sheet ? sheet.visual : undefined}
          confirmLabel={sheet.confirmLabel}
          destructive={"destructive" in sheet ? sheet.destructive : false}
          disabled={"disabled" in sheet ? sheet.disabled : false}
          pending={pending}
          error={error}
          onConfirm={() => void sheet.onConfirm()}
          onClose={close}
        />
      ) : null}
    </>
  );
}
