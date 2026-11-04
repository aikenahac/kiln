import { memo } from "react";

import { statusLamps } from "@/api/logs";
import type { ActivityItem } from "@/api/services/activity";
import { ProjectIcon } from "@/components/project-icon";
import { StatusRow } from "@/components/status-row";
import {
  buildStatus,
  buildTitle,
  duration,
  platformLabel,
  relativeTime,
  runLabel,
  runRowStatus,
  statusLabel,
  submissionLabel,
  submissionRowStatus,
} from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";

export const ActivityRow = memo(function ActivityRow({
  item,
  showError = false,
}: {
  item: ActivityItem;
  showError?: boolean;
}) {
  const routes = useDetailRoutes();
  const leading = <ProjectIcon project={item.project} size="md" />;
  switch (item.kind) {
    case "build": {
      const { build } = item;
      const queue =
        build.status === "IN_QUEUE" && build.queuePosition
          ? ` · position ${build.queuePosition}${build.estimatedWaitTimeLeftSeconds ? `, about ${Math.max(1, Math.ceil(build.estimatedWaitTimeLeftSeconds / 60))} min` : ""}`
          : "";
      return (
        <StatusRow
          leading={leading}
          title={buildTitle(build)}
          subtitle={`Build · ${build.buildProfile ?? "default"} · ${statusLabel(build.status)}${build.metrics?.buildDuration ? ` in ${duration(build.metrics.buildDuration)}` : ""}${queue}`}
          error={showError ? build.error?.message : undefined}
          meta={relativeTime(item.time)}
          status={buildStatus(build)}
          phases={statusLamps(build.status)}
          onPress={() => routes.build(item.project.id, build.id)}
        />
      );
    }
    case "submission": {
      const { submission } = item;
      return (
        <StatusRow
          leading={leading}
          title={`${item.project.name} to ${submission.platform === "IOS" ? "App Store Connect" : "Google Play"}`}
          subtitle={`Submission · ${submissionLabel(submission.status)}${submission.submittedBuild?.appVersion ? ` · ${submission.submittedBuild.appVersion}` : ""}`}
          error={showError ? (submission.error?.message ?? undefined) : undefined}
          meta={relativeTime(item.time)}
          status={submissionRowStatus(submission.status)}
          phases={statusLamps(submission.status)}
          onPress={() => routes.submission(item.project.id, submission.id)}
        />
      );
    }
    case "update": {
      const first = item.group.updates[0]!;
      return (
        <StatusRow
          leading={leading}
          title={first.message ?? `${item.project.name} update`}
          subtitle={`Update · ${item.project.name} · ${first.branch.name} · ${item.group.updates.map((update) => platformLabel(update.platform)).join(" + ")}`}
          meta={relativeTime(item.time)}
          status="done"
          onPress={() => routes.update(item.project.id, item.group.group)}
        />
      );
    }
    case "run": {
      const { run } = item;
      return (
        <StatusRow
          leading={leading}
          title={run.gitCommitMessage?.split("\n")[0] ?? run.name}
          subtitle={`Workflow · ${item.project.name} · ${run.workflow.name ?? run.workflow.fileName} · ${runLabel(run.status).toLowerCase()}`}
          error={showError ? run.errors[0]?.message : undefined}
          meta={relativeTime(item.time)}
          status={runRowStatus(run.status)}
          phases={statusLamps(run.status)}
          onPress={() => routes.run(item.project.id, run.id)}
        />
      );
    }
  }
});
