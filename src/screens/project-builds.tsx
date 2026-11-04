import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import { useBuilds } from "@/api/hooks/use-builds";
import { statusLamps } from "@/api/logs";
import type { BuildFilter } from "@/api/services/core";
import { ResourceList } from "@/components/resource-list";
import { Chips } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import {
  buildStatus,
  duration,
  platformLabel,
  relativeTime,
  statusLabel,
} from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";

const filters = ["All", "iOS", "Android", "Running", "Failed", "Internal", "Store"] as const;
type Filter = (typeof filters)[number];

const apiFilter: Record<Filter, BuildFilter | undefined> = {
  All: undefined,
  iOS: { platform: "IOS" },
  Android: { platform: "ANDROID" },
  Running: { status: "IN_PROGRESS" },
  Failed: { status: "ERRORED" },
  Internal: { distribution: "INTERNAL" },
  Store: { distribution: "STORE" },
};

export default function ProjectBuildsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [filter, setFilter] = useState<Filter>("All");
  const query = useBuilds(id, apiFilter[filter]);
  const routes = useDetailRoutes();
  const builds = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  return (
    <ResourceList
      data={builds}
      keyExtractor={(build) => build.id}
      query={query}
      header={<Chips options={filters} value={filter} onChange={setFilter} />}
      empty={{ title: "No builds", body: "No builds match this filter." }}
      renderItem={(build) => (
        <StatusRow
          title={`${platformLabel(build.platform)} · ${build.buildProfile ?? "default"}`}
          subtitle={[
            build.appVersion
              ? `${build.appVersion}${build.appBuildVersion ? ` (${build.appBuildVersion})` : ""}`
              : undefined,
            `${statusLabel(build.status)}${build.metrics?.buildDuration ? ` in ${duration(build.metrics.buildDuration)}` : ""}`,
            build.gitCommitMessage?.split("\n")[0],
          ]
            .filter(Boolean)
            .join(" · ")}
          error={build.error?.message}
          meta={relativeTime(build.createdAt)}
          status={buildStatus(build)}
          phases={statusLamps(build.status)}
          onPress={() => routes.build(id, build.id)}
        />
      )}
    />
  );
}
