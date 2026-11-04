import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import { useSubmissions } from "@/api/hooks/use-submissions";
import { statusLamps } from "@/api/logs";
import type { SubmissionFilter } from "@/api/services/submissions";
import { ResourceList } from "@/components/resource-list";
import { Chips, Note } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import {
  platformLabel,
  relativeTime,
  submissionLabel,
  submissionRowStatus,
} from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";

const filters = ["All", "iOS", "Android", "Failed"] as const;
type Filter = (typeof filters)[number];
const apiFilter: Record<Filter, SubmissionFilter> = {
  All: {},
  iOS: { platform: "IOS" },
  Android: { platform: "ANDROID" },
  Failed: { status: "ERRORED" },
};

export default function ProjectSubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [filter, setFilter] = useState<Filter>("All");
  const query = useSubmissions(id, apiFilter[filter]);
  const routes = useDetailRoutes();
  const items = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  return (
    <ResourceList
      data={items}
      keyExtractor={(item) => item.id}
      query={query}
      header={
        <>
          <Chips options={filters} value={filter} onChange={setFilter} />
          <Note>Uploads to App Store Connect and Google Play. Store review isn&apos;t tracked here.</Note>
        </>
      }
      empty={{
        title: "No submissions",
        body: "Submit a build with eas submit or a workflow, and it appears here.",
      }}
      renderItem={(item) => (
        <StatusRow
          title={`${platformLabel(item.platform)}${item.submittedBuild?.appVersion ? ` · ${item.submittedBuild.appVersion} (${item.submittedBuild.appBuildVersion ?? "?"})` : ""}`}
          subtitle={[
            submissionLabel(item.status),
            item.androidConfig?.track ? `${item.androidConfig.track} track` : undefined,
            item.initiatingActor?.displayName,
          ]
            .filter(Boolean)
            .join(" · ")}
          error={item.error?.message ?? undefined}
          meta={relativeTime(item.createdAt)}
          status={submissionRowStatus(item.status)}
          phases={statusLamps(item.status)}
          onPress={() => routes.submission(id, item.id)}
        />
      )}
    />
  );
}
