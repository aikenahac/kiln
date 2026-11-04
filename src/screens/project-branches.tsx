import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { errorCopy } from "@/api/errors";
import { useProject } from "@/api/hooks/use-projects";
import { useBranches, useChannelActions, useChannels } from "@/api/hooks/use-updates";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { ResourceList } from "@/components/resource-list";
import { Button } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { parseChannelMapping } from "@/lib/branch-mapping";
import { relativeTime } from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";
import { usePalette } from "@/providers/theme-provider";
import type { Branch } from "@/types/api";

type Edit =
  | { kind: "create"; name: string }
  | { kind: "rename"; branch: Branch; name: string }
  | { kind: "delete"; branch: Branch };

export default function ProjectBranchesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const branches = useBranches(id);
  const channels = useChannels(id);
  const actions = useChannelActions(id);
  const routes = useDetailRoutes();
  const colors = usePalette();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState<string>();

  const channelsFor = (branchId: string) =>
    (channels.data ?? [])
      .filter((channel) => {
        const mapping = parseChannelMapping(channel.branchMapping);
        return mapping.kind === "single"
          ? mapping.branchId === branchId
          : mapping.kind === "rollout"
            ? mapping.rolledOutBranchId === branchId || mapping.defaultBranchId === branchId
            : mapping.kind === "custom" && mapping.branchIds.includes(branchId);
      })
      .map((channel) => channel.name);

  const close = () => {
    setEdit(null);
    setError(undefined);
  };
  const run = (promise: Promise<unknown>) =>
    promise.then(close, (failure: unknown) => setError(errorCopy(failure)));
  const projectLabel = project.data
    ? `${project.data.ownerAccount.name} / ${project.data.slug}`
    : "This project";

  const input = (value: string, onChange: (value: string) => void) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="Branch name"
      placeholderTextColor={colors.ink2}
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus
      className="h-12 rounded-field bg-raised-2 px-4 text-[17px] text-ink"
    />
  );

  const pending =
    actions.createBranch.isPending ||
    actions.renameBranch.isPending ||
    actions.deleteBranch.isPending;

  return (
    <>
      <ResourceList
        data={branches.data ?? []}
        keyExtractor={(branch) => branch.id}
        query={branches}
        empty={{ title: "No branches", body: "eas update creates a branch the first time you publish to it." }}
        footer={
          <View className="px-5 pt-4 android:px-4">
            <Button label="New branch" onPress={() => setEdit({ kind: "create", name: "" })} />
          </View>
        }
        renderItem={(branch) => {
          const served = channelsFor(branch.id);
          return (
            <StatusRow
              title={branch.name}
              subtitle={[
                branch.latestUpdate?.message ?? (branch.latestUpdate ? "No message" : "No updates"),
                branch.latestUpdate ? `runtime ${branch.latestUpdate.runtimeVersion}` : undefined,
                served.length ? `served by ${served.join(", ")}` : "not on a channel",
              ]
                .filter(Boolean)
                .join(" · ")}
              meta={branch.latestUpdate ? relativeTime(branch.latestUpdate.createdAt) : undefined}
              onPress={() =>
                Alert.alert(branch.name, undefined, [
                  ...(branch.latestUpdate
                    ? [{ text: "Open latest update", onPress: () => routes.update(id, branch.latestUpdate!.group) }]
                    : []),
                  { text: "Rename", onPress: () => setEdit({ kind: "rename", branch, name: branch.name }) },
                  { text: "Delete branch", style: "destructive" as const, onPress: () => setEdit({ kind: "delete", branch }) },
                  { text: "Cancel", style: "cancel" as const },
                ])
              }
            />
          );
        }}
      />
      {edit ? (
        <ConfirmSheet
          visible
          title={
            edit.kind === "create"
              ? "New branch"
              : edit.kind === "rename"
                ? `Rename ${edit.branch.name}`
                : `Delete ${edit.branch.name}?`
          }
          body={
            edit.kind === "delete"
              ? channelsFor(edit.branch.id).length
                ? `Channels ${channelsFor(edit.branch.id).join(", ")} point at this branch. Expo refuses to delete a branch a channel uses; remap them first.`
                : "Its updates are deleted with it. Expo schedules the deletion; it can't be undone."
              : edit.kind === "rename"
                ? "Channels keep pointing at this branch under its new name. Scripts that publish by name need updating."
                : "Publish to it with eas update --branch, then map a channel to it."
          }
          scope={[
            { label: "Project", value: projectLabel },
            ...(edit.kind === "create" ? [] : [{ label: "Branch", value: edit.branch.name }]),
          ]}
          visual={
            edit.kind === "delete"
              ? undefined
              : input(edit.name, (name) => setEdit({ ...edit, name }))
          }
          confirmLabel={
            edit.kind === "create" ? "Create branch" : edit.kind === "rename" ? "Rename" : "Delete branch"
          }
          destructive={edit.kind === "delete"}
          disabled={edit.kind !== "delete" && !edit.name.trim()}
          pending={pending}
          error={error}
          onClose={close}
          onConfirm={() =>
            void run(
              edit.kind === "create"
                ? actions.createBranch.mutateAsync(edit.name.trim())
                : edit.kind === "rename"
                  ? actions.renameBranch.mutateAsync({ branchId: edit.branch.id, name: edit.name.trim() })
                  : actions.deleteBranch.mutateAsync(edit.branch.id),
            )
          }
        />
      ) : null}
    </>
  );
}
