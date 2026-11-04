import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { errorCopy } from "@/api/errors";
import { useProject, useProjectSummary } from "@/api/hooks/use-projects";
import type { Section } from "@/api/services/summary";
import { Icon } from "@/components/icon";
import { ProjectIcon } from "@/components/project-icon";
import { Button, ErrorState, LoadingState, SectionTitle } from "@/components/screen-parts";
import { SplitBar } from "@/components/split-bar";
import { StatusRow } from "@/components/status-row";
import { mappingSegments, parseChannelMapping } from "@/lib/branch-mapping";
import {
  buildStatus,
  expoUrls,
  platformLabel,
  relativeTime,
  runLabel,
  runRowStatus,
  statusLabel,
  submissionLabel,
  submissionRowStatus,
  type RowStatus,
} from "@/lib/format";
import { recordRecent, useFavorites } from "@/lib/preferences";
import { usePalette } from "@/providers/theme-provider";

function summaryText<T>(
  section: Section<T> | undefined,
  describe: (value: NonNullable<T>) => string,
  empty: string,
): string {
  if (!section) return "Loading";
  if (!section.ok) return errorCopy(section.error).split(".")[0] ?? "Not available";
  return section.value ? describe(section.value as NonNullable<T>) : empty;
}

export default function ProjectHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const summary = useProjectSummary(id);
  const { favorites, toggle } = useFavorites();
  const colors = usePalette();
  useEffect(() => {
    if (id) recordRecent(id);
  }, [id]);

  if (project.isPending) return <LoadingState label="Loading project" />;
  if (project.error || !project.data)
    return <ErrorState error={project.error} retry={() => void project.refetch()} />;
  const app = project.data;
  const favorite = favorites.includes(app.id);
  const data = summary.data;
  const channels = data?.channels.ok ? data.channels.value : [];
  const production =
    channels.find((channel) => channel.name === "production") ?? channels[0];
  const productionMapping = production ? parseChannelMapping(production.branchMapping) : undefined;
  const branchName = (branchId: string) =>
    production?.updateBranches.find((branch) => branch.id === branchId)?.name ?? "Unknown branch";
  const repo = app.githubRepository?.metadata;

  const push = (
    pathname:
      | "/(main)/projects/[id]/builds"
      | "/(main)/projects/[id]/submissions"
      | "/(main)/projects/[id]/updates"
      | "/(main)/projects/[id]/channels"
      | "/(main)/projects/[id]/branches"
      | "/(main)/projects/[id]/workflows"
      | "/(main)/projects/[id]/environment"
      | "/(main)/projects/[id]/hosting",
  ) => router.push({ pathname, params: { id } });

  const build = data?.latestBuild.ok ? data.latestBuild.value : undefined;
  const submission = data?.latestSubmission.ok ? data.latestSubmission.value : undefined;
  const run = data?.latestRun.ok ? data.latestRun.value : undefined;

  const rows: {
    title: string;
    subtitle: string;
    status?: RowStatus;
    onPress: () => void;
  }[] = [
    {
      title: "Builds",
      subtitle: summaryText(
        data?.latestBuild,
        (value) => `${platformLabel(value.platform)} ${statusLabel(value.status)} · ${relativeTime(value.createdAt)}`,
        "No builds yet",
      ),
      status: build ? buildStatus(build) : undefined,
      onPress: () => push("/(main)/projects/[id]/builds"),
    },
    {
      title: "Submissions",
      subtitle: summaryText(
        data?.latestSubmission,
        (value) => `${platformLabel(value.platform)} ${submissionLabel(value.status).toLowerCase()} · ${relativeTime(value.createdAt)}`,
        "No submissions yet",
      ),
      status: submission ? submissionRowStatus(submission.status) : undefined,
      onPress: () => push("/(main)/projects/[id]/submissions"),
    },
    {
      title: "Updates",
      subtitle: summaryText(
        data?.latestUpdate,
        (value) => `${value.updates[0]?.message ?? "No message"} · ${value.updates[0]?.branch.name} · ${relativeTime(value.updates[0]!.createdAt)}`,
        "No updates yet",
      ),
      onPress: () => push("/(main)/projects/[id]/updates"),
    },
    {
      title: "Channels",
      subtitle: summaryText(
        data?.channels,
        (value) =>
          value.length
            ? `${value.length} channel${value.length === 1 ? "" : "s"}${value.some((channel) => parseChannelMapping(channel.branchMapping).kind === "rollout") ? " · rollout in progress" : ""}`
            : "No channels",
        "No channels",
      ),
      onPress: () => push("/(main)/projects/[id]/channels"),
    },
    {
      title: "Branches",
      subtitle: "Update branches and what each channel serves",
      onPress: () => push("/(main)/projects/[id]/branches"),
    },
    {
      title: "Workflows",
      subtitle: summaryText(
        data?.latestRun,
        (value) => `${value.workflow.name ?? value.workflow.fileName} ${runLabel(value.status).toLowerCase()} · ${relativeTime(value.createdAt)}`,
        "No workflow runs yet",
      ),
      status: run ? runRowStatus(run.status) : undefined,
      onPress: () => push("/(main)/projects/[id]/workflows"),
    },
    {
      title: "Environment variables",
      subtitle: "Names and metadata. Values are never fetched.",
      onPress: () => push("/(main)/projects/[id]/environment"),
    },
    {
      title: "Hosting",
      subtitle: "EAS Hosting deployments and aliases",
      onPress: () => push("/(main)/projects/[id]/hosting"),
    },
    {
      title: "Devices",
      subtitle: "Registered Apple devices on this account",
      onPress: () => router.push("/(main)/account/devices"),
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-ground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-28"
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => {
            void project.refetch();
            void summary.refetch();
          }}
          tintColor={colors.ink2}
        />
      }
    >
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Pressable
              onPress={() => toggle(app.id)}
              className="h-11 w-11 items-center justify-center"
              accessibilityRole="button"
              accessibilityState={{ selected: favorite }}
              accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Icon name={favorite ? "starFill" : "star"} size={20} color={favorite ? "liveInk" : "ink"} />
            </Pressable>
          ),
        }}
      />
      <View className="gap-4 px-5 pb-6 pt-2 android:px-4">
        <View className="flex-row items-center gap-4">
          <ProjectIcon project={app} size="lg" />
          <View className="min-w-0 flex-1">
            <Text className="text-[34px] font-bold leading-[38px] text-ink" numberOfLines={2}>
              {app.name}
            </Text>
            <Text className="mt-1 text-[15px] text-ink-2" numberOfLines={1}>
              {app.fullName}
            </Text>
          </View>
        </View>
        {repo || app.latestActivity ? (
          <Text className="text-[13px] text-ink-2">
            {[repo ? `${repo.githubRepoOwnerName}/${repo.githubRepoName}` : undefined, app.latestActivity ? `active ${relativeTime(app.latestActivity)}` : undefined]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}
        <Pressable
          onPress={() => push("/(main)/projects/[id]/channels")}
          className="gap-3 rounded-[26px] bg-raised p-5 active:opacity-80 android:rounded-2xl"
          accessibilityRole="button"
          accessibilityHint="Opens channels"
        >
          <Text className="text-[13px] font-semibold text-ink-2">
            {production ? `${production.name} channel` : "Production channel"}
          </Text>
          {!data ? (
            <Text className="text-[15px] text-ink-2">Loading channels</Text>
          ) : !data.channels.ok ? (
            <Text className="text-[15px] text-ink-2">{errorCopy(data.channels.error)}</Text>
          ) : !production || !productionMapping ? (
            <Text className="text-[15px] text-ink-2">No channels. Builds with a channel set create one.</Text>
          ) : productionMapping.kind === "custom" ? (
            <Text className="text-[15px] text-ink-2">Custom branch mapping. Open Channels for details.</Text>
          ) : (
            <>
              <Text
                className="text-[42px] font-black leading-[44px] text-ink"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {productionMapping.kind === "rollout" ? `${productionMapping.percent}%` : productionMapping.kind === "single" ? branchName(productionMapping.branchId) : "—"}
              </Text>
              <Text className="text-[15px] text-ink-2">
                {productionMapping.kind === "rollout"
                  ? `on ${branchName(productionMapping.rolledOutBranchId)}, the rest on ${branchName(productionMapping.defaultBranchId)}`
                  : productionMapping.kind === "single"
                    ? "serves every user on this channel"
                    : "No branch mapped"}
              </Text>
              <SplitBar segments={mappingSegments(productionMapping, branchName)} />
              {production.isPaused ? (
                <Text className="text-[13px] font-semibold text-alarm-ink">Paused. Devices get no new updates.</Text>
              ) : null}
            </>
          )}
        </Pressable>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="Builds" variant="primary" onPress={() => push("/(main)/projects/[id]/builds")} />
          </View>
          <View className="flex-1">
            <Button label="Open in Expo" onPress={() => void WebBrowser.openBrowserAsync(expoUrls.project(app))} />
          </View>
        </View>
      </View>
      <SectionTitle>Project</SectionTitle>
      {rows.map((row) => (
        <StatusRow key={row.title} title={row.title} subtitle={row.subtitle} status={row.status} onPress={row.onPress} />
      ))}
    </ScrollView>
  );
}
