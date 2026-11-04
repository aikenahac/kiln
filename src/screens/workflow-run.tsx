import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";

import { errorCopy } from "@/api/errors";
import { useWorkflowActions, useWorkflowRun } from "@/api/hooks/use-workflows";
import { isActiveStatus } from "@/api/polling";
import { PhaseLamps, type LampPhase } from "@/components/phase-lamps";
import {
  Button,
  ErrorState,
  Fact,
  FactGroup,
  LoadingState,
  SectionTitle,
} from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import {
  dateTime,
  duration,
  expoUrls,
  platformLabel,
  relativeTime,
  runLabel,
  runRowStatus,
  secondsBetween,
  shortHash,
} from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";
import { usePalette } from "@/providers/theme-provider";
import type { WorkflowJob } from "@/types/api";

function jobLamp(job: WorkflowJob): LampPhase {
  const status = runRowStatus(job.status);
  return {
    name: job.name,
    state:
      status === "failed"
        ? "failed"
        : status === "live"
          ? "live"
          : status === "done"
            ? "done"
            : "off",
    duration:
      job.status === "SUCCESS" || job.status === "FAILURE"
        ? duration(secondsBetween(job.createdAt, job.updatedAt))
        : undefined,
  };
}

export default function WorkflowRunScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const query = useWorkflowRun(projectId, id);
  const actions = useWorkflowActions(projectId);
  const routes = useDetailRoutes();
  const colors = usePalette();
  const run = query.data;
  if (query.isPending) return <LoadingState label="Loading workflow run" />;
  if (query.error || !run)
    return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const active = isActiveStatus(run.status);
  const failed = run.status === "FAILURE";
  const scope = `${run.app.ownerAccount.name} · ${run.app.name}\n${run.workflow.name ?? run.workflow.fileName}`;

  const confirmCancel = () =>
    Alert.alert("Cancel workflow run?", scope, [
      { text: "Keep running", style: "cancel" },
      {
        text: "Cancel run",
        style: "destructive",
        onPress: () =>
          actions.cancel.mutate(run.id, {
            onError: (error) => Alert.alert("Run not canceled", errorCopy(error)),
          }),
      },
    ]);
  const confirmRetry = (fromFailedJobs: boolean) =>
    Alert.alert(
      fromFailedJobs ? "Rerun failed jobs?" : "Rerun all jobs?",
      `${scope}\nRuns on Expo with the same commit and inputs.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Rerun",
          onPress: () =>
            actions.retry.mutate(
              { runId: run.id, fromFailedJobs },
              {
                onSuccess: (result) => routes.run(projectId, result.id),
                onError: (error) => Alert.alert("Run not started", errorCopy(error)),
              },
            ),
        },
      ],
    );

  return (
    <ScrollView
      className="flex-1 bg-ground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-28"
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.ink2}
        />
      }
    >
      <Stack.Screen options={{ title: run.workflow.name ?? run.workflow.fileName }} />
      <View className="gap-4 px-5 py-5 android:px-4">
        <Text
          className={`text-[13px] font-semibold ${failed ? "text-alarm-ink" : active ? "text-live-ink" : "text-ink-2"}`}
        >
          {runLabel(run.status)}
          {run.durationSeconds ? ` · ${duration(run.durationSeconds)}` : ""}
        </Text>
        <Text className="text-[30px] font-bold leading-[36px] text-ink">
          {run.gitCommitMessage?.split("\n")[0] ?? run.name}
        </Text>
        {run.jobs.length ? (
          <PhaseLamps phases={run.jobs.slice(0, 7).map(jobLamp)} size="row" />
        ) : null}
        {run.errors.map((error, index) => (
          <View key={index} className="rounded-2xl bg-alarm/10 p-4">
            <Text className="text-[15px] font-semibold text-alarm-ink">{error.title}</Text>
            <Text className="mt-1 font-mono text-[13px] leading-[19px] text-alarm-ink" selectable>
              {error.message}
            </Text>
          </View>
        ))}
        <View className="gap-3">
          {active ? (
            <Button
              label="Cancel run"
              variant="destructive"
              pending={actions.cancel.isPending}
              pendingLabel="Canceling"
              onPress={confirmCancel}
            />
          ) : null}
          {failed ? (
            <Button
              label="Rerun failed jobs"
              variant="primary"
              pending={actions.retry.isPending}
              pendingLabel="Starting"
              onPress={() => confirmRetry(true)}
            />
          ) : null}
          {!active ? (
            <Button
              label="Rerun all jobs"
              pending={actions.retry.isPending}
              pendingLabel="Starting"
              onPress={() => confirmRetry(false)}
            />
          ) : null}
        </View>
      </View>

      <SectionTitle>Jobs</SectionTitle>
      {run.jobs.map((job) => {
        const open = job.turtleBuild
          ? () => routes.build(projectId, job.turtleBuild!.id)
          : job.turtleSubmission
            ? () => routes.submission(projectId, job.turtleSubmission!.id)
            : job.turtleJobRun?.logFileUrls.length
              ? () => routes.job(projectId, run.id, job.id)
              : undefined;
        const error = job.errors[0]?.message ?? job.turtleJobRun?.errors[0]?.message;
        return (
          <StatusRow
            key={job.id}
            title={job.name}
            subtitle={[
              runLabel(job.status),
              job.turtleBuild ? `${platformLabel(job.turtleBuild.platform)} build` : undefined,
              job.turtleSubmission
                ? `${platformLabel(job.turtleSubmission.platform)} submission`
                : undefined,
              job.status === "SUCCESS" || job.status === "FAILURE"
                ? duration(secondsBetween(job.createdAt, job.updatedAt))
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
            status={runRowStatus(job.status)}
            error={error}
            onPress={open}
          />
        );
      })}

      <SectionTitle>Run</SectionTitle>
      <FactGroup>
        <Fact label="Workflow file" value={run.workflow.fileName} mono />
        <Fact label="Git ref" value={run.requestedGitRef} mono />
        <Fact label="Commit" value={shortHash(run.gitCommitHash)} mono />
        <Fact label="Trigger" value={run.triggerEventType.toLowerCase().replaceAll("_", " ")} />
        <Fact label="Started by" value={run.actor?.displayName} />
        <Fact label="Created" value={`${dateTime(run.createdAt)} · ${relativeTime(run.createdAt)}`} />
        <Fact label="Finished" value={dateTime(run.finalizedAt)} />
      </FactGroup>

      <View className="px-5 pt-8 android:px-4">
        <Button
          label="Open in Expo"
          onPress={() => void WebBrowser.openBrowserAsync(expoUrls.workflowRun(run.app, run.id))}
        />
      </View>
    </ScrollView>
  );
}
