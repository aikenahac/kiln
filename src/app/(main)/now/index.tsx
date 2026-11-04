import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { useLogs } from "@/api/hooks/use-logs";
import { useProjects } from "@/api/hooks/use-projects";
import { queryKeys } from "@/api/keys";
import { phasesFromSteps, statusLamps } from "@/api/logs";
import { usePollInterval } from "@/api/hooks/use-poll-interval";
import { isActiveStatus } from "@/api/polling";
import { getRecentActivity, type ActivityItem } from "@/api/services/activity";
import { ActivityRow } from "@/components/activity-row";
import { PhaseLamps } from "@/components/phase-lamps";
import { ProjectIcon } from "@/components/project-icon";
import {
  AccountPill,
  EmptyState,
  ErrorState,
  SectionTitle,
} from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { buildTitle, duration, relativeTime, shortHash, statusLabel } from "@/lib/format";
import { preferenceKeys, useFavorites, useStringList } from "@/lib/preferences";
import { useDetailRoutes } from "@/lib/routes";
import { useAuth } from "@/providers/auth-provider";
import { usePalette } from "@/providers/theme-provider";
import type { Build } from "@/types/api";

function isActive(item: ActivityItem): boolean {
  switch (item.kind) {
    case "build":
      return isActiveStatus(item.build.status);
    case "submission":
      return isActiveStatus(item.submission.status);
    case "run":
      return isActiveStatus(item.run.status);
    case "update":
      return false;
  }
}

/** Older failures can't be acted on anymore; they move to Recent. */
const NEEDS_A_LOOK_MAX_AGE_MS = 30 * 86_400_000;

function isFailed(item: ActivityItem): boolean {
  return (
    (item.kind === "build" && item.build.status === "ERRORED") ||
    (item.kind === "submission" && item.submission.status === "ERRORED") ||
    (item.kind === "run" && item.run.status === "FAILURE")
  );
}

function Hero({ build }: { build: Build }) {
  const routes = useDetailRoutes();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  const running = build.status === "IN_PROGRESS";
  const logs = useLogs(
    useMemo(
      () =>
        running
          ? {
              kind: "build" as const,
              id: build.id,
              urls: build.logFiles,
              active: true,
              realtime: { type: "BUILD" as const, id: build.id },
              refreshUrls: async () => [],
            }
          : undefined,
      [build.id, build.logFiles, running],
    ),
  );
  const phases = logs.data ? phasesFromSteps(logs.data) : [];
  return (
    <View className="gap-4 px-5 android:px-4">
      <View className="flex-row items-center gap-2">
        <ProjectIcon project={build.app} size="sm" />
        <Text className={`text-[13px] font-semibold ${running ? "text-live-ink" : "text-ink-2"}`}>
          {running
            ? "Building now"
            : `${statusLabel(build.status).replace(/^./, (c) => c.toUpperCase())}${build.queuePosition ? ` · position ${build.queuePosition}` : ""}`}
        </Text>
      </View>
      <View>
        <Text
          className="text-[86px] font-black leading-[82px] tracking-[-2px] text-ink"
          style={{ fontVariant: ["tabular-nums"] }}
          accessibilityLabel={`Elapsed ${duration((now - new Date(build.createdAt).getTime()) / 1000)}`}
        >
          {duration((now - new Date(build.createdAt).getTime()) / 1000)}
        </Text>
        <Text
          className="mt-3 text-[22px] font-bold text-ink"
          onPress={() => routes.build(build.app.id, build.id)}
          accessibilityRole="link"
        >
          {buildTitle(build)}
        </Text>
        <Text className="mt-0.5 text-[15px] text-ink-2">
          {build.buildProfile ?? "default"}
          {build.appVersion ? ` · ${build.appVersion}` : ""}
          {build.appBuildVersion ? ` (${build.appBuildVersion})` : ""}
          {build.estimatedWaitTimeLeftSeconds && !running
            ? ` · about ${Math.max(1, Math.ceil(build.estimatedWaitTimeLeftSeconds / 60))} min to start`
            : ""}
        </Text>
      </View>
      <PhaseLamps size="hero" phases={phases.length ? phases : statusLamps(build.status)} />
      <Text className="font-mono text-[13px] leading-[18px] text-ink-2" selectable numberOfLines={2}>
        {shortHash(build.gitCommitHash) ?? "No commit"} {build.gitCommitMessage ?? build.message ?? ""}
      </Text>
    </View>
  );
}

export default function NowScreen() {
  const { token, account } = useAuth();
  const colors = usePalette();
  const routes = useDetailRoutes();
  const interval = usePollInterval(true);
  const query = useQuery({
    queryKey: queryKeys.overview(account?.id ?? "none"),
    enabled: Boolean(token && account),
    queryFn: ({ signal }) =>
      getRecentActivity(token!, account!.id, { projects: 6, perSource: 6 }, signal),
    refetchInterval: (state) => (state.state.data?.items.some(isActive) ? interval : false),
  });
  const { favorites } = useFavorites();
  const [recents] = useStringList(preferenceKeys.recents);
  const projects = useProjects();
  const known = useMemo(
    () => [
      ...(query.data?.projects ?? []),
      ...(projects.data?.pages.flatMap((page) => page.projects) ?? []),
    ],
    [projects.data, query.data],
  );
  const pinned = useMemo(() => {
    const byId = new Map(known.map((project) => [project.id, project]));
    const ids = [...favorites, ...recents.filter((id) => !favorites.includes(id))];
    return ids.flatMap((id) => (byId.get(id) ? [byId.get(id)!] : [])).slice(0, 6);
  }, [favorites, known, recents]);

  const items = query.data?.items ?? [];
  const builds = items.flatMap((item) => (item.kind === "build" ? [item.build] : []));
  const hero =
    builds.find((build) => build.status === "IN_PROGRESS") ??
    builds.find((build) => isActiveStatus(build.status));
  // Measured from the last fetch, not the render clock, so it stays stable.
  const isFreshFailure = (item: ActivityItem) =>
    isFailed(item) &&
    query.dataUpdatedAt - new Date(item.time).getTime() <= NEEDS_A_LOOK_MAX_AGE_MS;
  const failures = items.filter(isFreshFailure).slice(0, 3);
  const running = items
    .filter((item) => isActive(item) && !(item.kind === "build" && item.build.id === hero?.id))
    .slice(0, 4);
  const recent = items.filter((item) => !isActive(item) && !isFreshFailure(item)).slice(0, 5);

  if (!account) {
    return (
      <ScrollView className="flex-1 bg-ground" contentInsetAdjustmentBehavior="automatic">
        <EmptyState
          title="No account access"
          body="This token is valid but can't see an Expo account. Check its restrictions in Expo, or replace it in Account."
        />
      </ScrollView>
    );
  }
  return (
    <ScrollView
      className="flex-1 bg-ground"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.ink2}
        />
      }
      contentContainerClassName="pb-28 pt-3"
    >
      <View className="px-5 android:px-4">
        <AccountPill />
      </View>
      {query.error && !query.data ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : null}
      {query.error && query.data ? (
        <Text className="px-5 pb-2 text-[13px] text-alarm-ink android:px-4">
          Refresh failed. Showing data from {new Date(query.dataUpdatedAt).toLocaleTimeString()}.
        </Text>
      ) : null}
      {!query.isPending && !query.error && items.length === 0 ? (
        <EmptyState
          title="Nothing running"
          body="Builds, submissions, updates and workflow runs from your six most active projects appear here."
        />
      ) : null}
      {hero ? <Hero build={hero} /> : null}
      {failures.length ? (
        <>
          <SectionTitle>Needs a look</SectionTitle>
          {failures.map((item) => (
            <ActivityRow key={item.id} item={item} showError />
          ))}
        </>
      ) : null}
      {running.length ? (
        <>
          <SectionTitle>Also running</SectionTitle>
          {running.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </>
      ) : null}
      {recent.length ? (
        <>
          <SectionTitle>Recent</SectionTitle>
          {recent.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </>
      ) : null}
      {pinned.length ? (
        <>
          <SectionTitle>Favorites and recent projects</SectionTitle>
          {pinned.map((project) => (
            <StatusRow
              key={project.id}
              leading={<ProjectIcon project={project} />}
              title={project.name}
              subtitle={`${favorites.includes(project.id) ? "Favorite · " : ""}${project.fullName}`}
              meta={project.latestActivity ? relativeTime(project.latestActivity) : undefined}
              onPress={() => routes.project(project.id)}
            />
          ))}
        </>
      ) : null}
      {query.data?.partialFailures ? (
        <Text className="px-5 pt-6 text-[13px] leading-[18px] text-ink-3 android:px-4">
          Some sources aren&apos;t available to this token, so this view may be incomplete.
        </Text>
      ) : null}
    </ScrollView>
  );
}
