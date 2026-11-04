import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import { useUpdateGroups } from "@/api/hooks/use-updates";
import { ResourceList } from "@/components/resource-list";
import { Chips } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { platformLabel, relativeTime, shortHash } from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";
import type { Platform } from "@/types/api";

const filters = ["All", "iOS", "Android"] as const;
type Filter = (typeof filters)[number];
const platformFilter: Record<Filter, Platform | undefined> = {
  All: undefined,
  iOS: "IOS",
  Android: "ANDROID",
};

export default function ProjectUpdatesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [filter, setFilter] = useState<Filter>("All");
  const query = useUpdateGroups(id, platformFilter[filter]);
  const routes = useDetailRoutes();
  const groups = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  return (
    <ResourceList
      data={groups}
      keyExtractor={(group) => group.group}
      query={query}
      header={<Chips options={filters} value={filter} onChange={setFilter} />}
      empty={{
        title: "No updates",
        body: "Publish with eas update or a workflow, and update groups appear here.",
      }}
      renderItem={({ group, updates }) => {
        const first = updates[0]!;
        return (
          <StatusRow
            title={first.isRollBackToEmbedded ? "Roll back to embedded" : (first.message ?? "No message")}
            subtitle={[
              first.branch.name,
              `runtime ${first.runtimeVersion}`,
              updates.map((update) => platformLabel(update.platform)).join(" + "),
              first.rolloutPercentage != null ? `${first.rolloutPercentage}% rollout` : undefined,
              shortHash(first.gitCommitHash),
            ]
              .filter(Boolean)
              .join(" · ")}
            meta={relativeTime(first.createdAt)}
            onPress={() => routes.update(id, group)}
          />
        );
      }}
    />
  );
}
