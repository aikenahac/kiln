import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, useWindowDimensions, View } from "react-native";

import { queryKeys } from "@/api/keys";
import { getRecentActivity, type ActivityItem, type ActivityKind } from "@/api/services/activity";
import { ActivityRow } from "@/components/activity-row";
import { FilterMenu, type FilterOption } from "@/components/filter-menu";
import { AccountPill, EmptyState, ErrorState } from "@/components/screen-parts";
import { useAuth } from "@/providers/auth-provider";
import { usePalette } from "@/providers/theme-provider";

const PROJECTS = 6;
const WINDOW_DAYS = 7;

type Kind = "all" | ActivityKind;
type PlatformFilter = "any" | "ios" | "android";
type StatusFilter = "any" | "running" | "failed";

const kindOptions: readonly FilterOption<Kind>[] = [
  { value: "all", label: "All activity" },
  { value: "build", label: "Builds" },
  { value: "submission", label: "Submissions" },
  { value: "update", label: "Updates" },
  { value: "run", label: "Workflows" },
];
const platformOptions: readonly FilterOption<PlatformFilter>[] = [
  { value: "any", label: "Any platform", icon: "platformAny", menuImage: "ipad.and.iphone" },
  { value: "ios", label: "iOS", icon: "platformIos", menuImage: "iphone" },
  { value: "android", label: "Android", icon: "platformAndroid", menuImage: "smartphone" },
];
const statusOptions: readonly FilterOption<StatusFilter>[] = [
  { value: "any", label: "Any status", icon: "statusAny", menuImage: "circle.dashed" },
  { value: "running", label: "Running", icon: "statusRunning", menuImage: "circle.fill", tone: "live" },
  { value: "failed", label: "Failed", icon: "statusFailed", menuImage: "exclamationmark.triangle.fill", tone: "alarm" },
];

function platformOf(item: ActivityItem): string | undefined {
  switch (item.kind) {
    case "build":
      return item.build.platform;
    case "submission":
      return item.submission.platform;
    case "update":
      return item.group.updates.map((update) => update.platform.toUpperCase()).join(",");
    case "run":
      return undefined;
  }
}

function statusOf(item: ActivityItem): "running" | "failed" | "other" {
  const status =
    item.kind === "build"
      ? item.build.status
      : item.kind === "submission"
        ? item.submission.status
        : item.kind === "run"
          ? item.run.status
          : "FINISHED";
  if (status === "ERRORED" || status === "FAILURE") return "failed";
  if (["IN_PROGRESS", "IN_QUEUE", "NEW", "WAITING", "AWAITING_BUILD", "PENDING_CANCEL", "ACTION_REQUIRED"].includes(status))
    return "running";
  return "other";
}

export default function ActivityScreen() {
  const { token, account } = useAuth();
  const colors = usePalette();
  // Below ~390pt (iPhone SE, mini, small Androids) active icon filters stay icon-only so the row fits.
  const roomy = useWindowDimensions().width >= 390;
  const [kind, setKind] = useState<Kind>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("any");
  const [status, setStatus] = useState<StatusFilter>("any");
  const [projectId, setProjectId] = useState("all");
  const query = useQuery({
    queryKey: queryKeys.activity(account?.id ?? "none"),
    enabled: Boolean(token && account),
    queryFn: ({ signal }) =>
      getRecentActivity(
        token!,
        account!.id,
        { projects: PROJECTS, perSource: 10, windowDays: WINDOW_DAYS },
        signal,
      ),
  });
  const projectOptions = useMemo<FilterOption<string>[]>(
    () => [
      { value: "all", label: "All projects" },
      ...(query.data?.projects.map((project) => ({ value: project.id, label: project.name })) ?? []),
    ],
    [query.data],
  );
  const items = useMemo(
    () =>
      (query.data?.items ?? []).filter((item) => {
        if (kind !== "all" && item.kind !== kind) return false;
        if (projectId !== "all" && item.project.id !== projectId) return false;
        if (platform !== "any" && !platformOf(item)?.includes(platform.toUpperCase())) return false;
        if (status !== "any" && statusOf(item) !== status) return false;
        return true;
      }),
    [kind, platform, projectId, query.data, status],
  );
  const projectCount = query.data?.projects.length ?? 0;
  const total = query.data?.items.length ?? 0;
  const filtered = kind !== "all" || projectId !== "all" || platform !== "any" || status !== "any";
  const clearFilters = () => {
    setKind("all");
    setProjectId("all");
    setPlatform("any");
    setStatus("any");
  };
  return (
    <FlatList
      className="flex-1 bg-ground"
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ActivityRow item={item} />}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-28 pt-3"
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.ink2}
        />
      }
      ListHeaderComponent={
        <View className="gap-3 pb-3">
          <View className="gap-1 px-5 android:px-4">
            <AccountPill />
            <Text className="text-[34px] font-bold text-ink android:text-[32px]">Activity</Text>
            {filtered ? (
              <View className="flex-row items-center">
                <Text className="text-[15px] text-ink-2">
                  {items.length} of {total} in the last {WINDOW_DAYS} days ·{" "}
                </Text>
                <Pressable
                  onPress={clearFilters}
                  hitSlop={12}
                  accessibilityRole="button"
                  className="active:opacity-60"
                >
                  <Text className="text-[15px] font-semibold text-ink">Clear filters</Text>
                </Pressable>
              </View>
            ) : (
              <Text className="text-[15px] text-ink-2">
                Last {WINDOW_DAYS} days across your {projectCount} most active project
                {projectCount === 1 ? "" : "s"}
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-1.5 px-5 android:px-4">
            <FilterMenu name="Type" variant="pill" options={kindOptions} value={kind} onChange={setKind} />
            {projectOptions.length > 2 ? (
              <FilterMenu
                name="Project"
                variant="pill"
                shrink
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
              />
            ) : null}
            <View className="flex-1" />
            <FilterMenu
              name="Platform"
              variant="icon"
              options={platformOptions}
              value={platform}
              onChange={setPlatform}
              labelWhenActive={roomy}
            />
            <FilterMenu
              name="Status"
              variant="icon"
              options={statusOptions}
              value={status}
              onChange={setStatus}
              labelWhenActive={roomy}
            />
          </View>
          {query.error && !query.data ? (
            <ErrorState error={query.error} retry={() => void query.refetch()} />
          ) : null}
          {query.data?.partialFailures ? (
            <Text className="px-5 text-[13px] text-ink-3 android:px-4">
              Some sources aren&apos;t available to this token, so this feed may be incomplete.
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !query.isPending && !query.error ? (
          <EmptyState
            title="No activity"
            body={`Nothing matches in the last ${WINDOW_DAYS} days. Kiln reads the first page of each source for ${PROJECTS} projects, not full history.`}
          />
        ) : undefined
      }
    />
  );
}
