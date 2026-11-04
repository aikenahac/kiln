import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";

import { isBuildActive, useBuild } from "@/api/hooks/use-builds";
import { useLogs, type LiveState, type LogSource } from "@/api/hooks/use-logs";
import { useSubmission } from "@/api/hooks/use-submissions";
import { useWorkflowRun } from "@/api/hooks/use-workflows";
import { ExpiredLogError } from "@/api/logs";
import { isActiveStatus } from "@/api/polling";
import { LogViewer } from "@/components/log-viewer";
import { useRefreshInterval } from "@/lib/preferences";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/screen-parts";

function LiveBanner({ live }: { live: LiveState }) {
  const [seconds] = useRefreshInterval();
  const polling = seconds ? `Refreshing every ${seconds}s while this screen is open.` : "Pull to refresh.";
  const copy: Record<LiveState, string> = {
    live: "Live. New lines stream in from Expo.",
    connecting: "Connecting to live logs.",
    unavailable: `Live logs aren't available right now. ${polling}`,
    off: `Still running. ${polling}`,
  };
  return (
    <View
      className="mx-4 flex-row items-center gap-2"
      accessibilityLiveRegion="polite"
    >
      <View
        className={`h-2.5 w-2.5 rounded-full ${live === "live" ? "bg-live" : live === "connecting" ? "border border-live" : "bg-lamp-done"}`}
      />
      <Text className={`flex-1 text-[13px] ${live === "live" ? "text-live-ink" : "text-ink-2"}`}>
        {copy[live]}
      </Text>
    </View>
  );
}

function LogsBody({
  title,
  source,
  parentPending,
  parentError,
  retryParent,
  emptyBody,
}: {
  title: string;
  source: LogSource | undefined;
  parentPending: boolean;
  parentError: unknown;
  retryParent: () => void;
  emptyBody: string;
}) {
  const logs = useLogs(source);
  if (parentPending || (source?.urls.length && logs.isPending))
    return <LoadingState label="Loading logs" />;
  if (parentError)
    return <ErrorState error={parentError} retry={retryParent} />;
  if (logs.error)
    return (
      <ErrorState
        error={
          logs.error instanceof ExpiredLogError
            ? new Error(
                "Expo's log link expired and a fresh one could not be fetched. Pull to refresh, or open the logs in Expo.",
              )
            : logs.error
        }
        retry={() => void logs.refetch()}
      />
    );
  if (!source?.urls.length || !logs.data?.length)
    return (
      <View className="flex-1 bg-ground">
        <EmptyState title="No logs yet" body={emptyBody} />
      </View>
    );
  return (
    <View className="flex-1 bg-ground">
      <LogViewer
        steps={logs.data}
        title={title}
        refreshing={logs.isRefetching}
        onRefresh={() => void logs.refetch()}
        follow={source.active}
        header={source.active ? <LiveBanner live={logs.live} /> : undefined}
      />
    </View>
  );
}

export function BuildLogsScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const build = useBuild(projectId, id);
  const active = isBuildActive(build.data?.status);
  const source = useMemo<LogSource | undefined>(
    () =>
      build.data
        ? {
            kind: "build",
            id: build.data.id,
            urls: build.data.logFiles,
            active,
            realtime: { type: "BUILD", id: build.data.id },
            refreshUrls: async () => (await build.refetch()).data?.logFiles ?? [],
          }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [build.data?.id, build.data?.logFiles, active],
  );
  return (
    <>
      <Stack.Screen options={{ title: "Build logs" }} />
      <LogsBody
        title={build.data ? `${build.data.app.name} build logs` : "Build logs"}
        source={source}
        parentPending={build.isPending}
        parentError={build.error}
        retryParent={() => void build.refetch()}
        emptyBody="Expo hasn't published logs for this build. Queued builds have none until a worker picks them up."
      />
    </>
  );
}

export function SubmissionLogsScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const submission = useSubmission(projectId, id);
  const active = isActiveStatus(submission.data?.status);
  const source = useMemo<LogSource | undefined>(
    () =>
      submission.data
        ? {
            kind: "submission",
            id: submission.data.id,
            urls: submission.data.logFiles,
            active,
            refreshUrls: async () =>
              (await submission.refetch()).data?.logFiles ?? [],
          }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submission.data?.id, submission.data?.logFiles, active],
  );
  return (
    <>
      <Stack.Screen options={{ title: "Submission logs" }} />
      <LogsBody
        title="Submission logs"
        source={source}
        parentPending={submission.isPending}
        parentError={submission.error}
        retryParent={() => void submission.refetch()}
        emptyBody="Expo hasn't published logs for this submission yet."
      />
    </>
  );
}

export function JobLogsScreen() {
  const { id, jobId, projectId } = useLocalSearchParams<{
    id: string;
    jobId: string;
    projectId: string;
  }>();
  const run = useWorkflowRun(projectId, id);
  const job = run.data?.jobs.find((item) => item.id === jobId);
  const active = isActiveStatus(job?.status);
  const urls = job?.turtleJobRun?.logFileUrls;
  const source = useMemo<LogSource | undefined>(
    () =>
      job && urls
        ? {
            kind: "job",
            id: job.id,
            urls,
            active,
            realtime: job.turtleJobRun ? { type: "JOB_RUN", id: job.turtleJobRun.id } : undefined,
            refreshUrls: async () =>
              (await run.refetch()).data?.jobs.find((item) => item.id === jobId)
                ?.turtleJobRun?.logFileUrls ?? [],
          }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [job?.id, urls, active],
  );
  return (
    <>
      <Stack.Screen options={{ title: job?.name ?? "Job logs" }} />
      <LogsBody
        title={job ? `${job.name} logs` : "Job logs"}
        source={source}
        parentPending={run.isPending}
        parentError={run.error ?? (run.data && !job ? new Error("This job is no longer part of the run.") : null)}
        retryParent={() => void run.refetch()}
        emptyBody={
          job?.turtleBuild || job?.turtleSubmission
            ? "This job ran a build or submission. Open it from the run for its logs."
            : "This job has no logs. Approval and skipped jobs don't produce any."
        }
      />
    </>
  );
}
