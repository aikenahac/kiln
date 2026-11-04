import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";

import { errorCopy } from "@/api/errors";
import { useSubmission, useSubmissionActions } from "@/api/hooks/use-submissions";
import { isActiveStatus } from "@/api/polling";
import { statusLamps } from "@/api/logs";
import { PhaseLamps } from "@/components/phase-lamps";
import { ProjectIcon } from "@/components/project-icon";
import {
  Button,
  ErrorState,
  Fact,
  FactGroup,
  LoadingState,
  SectionTitle,
} from "@/components/screen-parts";
import {
  dateTime,
  duration,
  expoUrls,
  platformLabel,
  secondsBetween,
  submissionLabel,
} from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";
import { usePalette } from "@/providers/theme-provider";
import type { Submission } from "@/types/api";

/** EAS only uploads. Store review is a separate system Kiln can't see. */
function storeNote(submission: Submission): string {
  if (submission.status !== "FINISHED")
    return submission.platform === "IOS"
      ? "EAS uploads the build to App Store Connect. Apple review isn't tracked here."
      : "EAS uploads the build to Google Play. Play review isn't tracked here.";
  return submission.platform === "IOS"
    ? "Uploaded to App Store Connect. Apple review isn't tracked here."
    : `Uploaded to Google Play${submission.androidConfig?.track ? ` on the ${submission.androidConfig.track} track` : ""}. Play review isn't tracked here.`;
}

export default function SubmissionDetailScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const query = useSubmission(projectId, id);
  const { retry, cancel } = useSubmissionActions(projectId, id);
  const routes = useDetailRoutes();
  const colors = usePalette();
  const [openedAt] = useState(() => Date.now());
  const submission = query.data;
  if (query.isPending) return <LoadingState label="Loading submission" />;
  if (query.error || !submission)
    return <ErrorState error={query.error} retry={() => void query.refetch()} />;

  const active = isActiveStatus(submission.status);
  const elapsed = secondsBetween(submission.createdAt, submission.completedAt);
  const retryWindowOpen =
    openedAt - new Date(submission.createdAt).getTime() <=
    submission.maxRetryTimeMinutes * 60_000;

  const confirm = (kind: "retry" | "cancel") =>
    Alert.alert(
      kind === "retry" ? "Retry submission?" : "Cancel submission?",
      `${submission.app.ownerAccount.name} · ${submission.app.name}\n${platformLabel(submission.platform)}${submission.submittedBuild?.appVersion ? ` · ${submission.submittedBuild.appVersion} (${submission.submittedBuild.appBuildVersion ?? "?"})` : ""}\nUses the store credentials already saved in Expo.`,
      [
        { text: kind === "retry" ? "Not now" : "Keep submitting", style: "cancel" },
        {
          text: kind === "retry" ? "Retry" : "Cancel submission",
          style: kind === "retry" ? "default" : "destructive",
          onPress: () =>
            (kind === "retry" ? retry : cancel).mutate(undefined, {
              onError: (error) =>
                Alert.alert(
                  kind === "retry" ? "Submission not retried" : "Submission not canceled",
                  errorCopy(error),
                ),
            }),
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
      <Stack.Screen options={{ title: "Submission" }} />
      <View className="gap-4 px-5 py-5 android:px-4">
        <View className="flex-row items-center gap-3">
          <ProjectIcon project={submission.app} size="sm" />
          <Text
            className={`text-[13px] font-semibold ${submission.status === "ERRORED" ? "text-alarm-ink" : active ? "text-live-ink" : "text-ink-2"}`}
          >
            {submissionLabel(submission.status)}
            {elapsed ? ` · ${duration(elapsed)}` : ""}
          </Text>
        </View>
        <Text className="text-[34px] font-bold leading-[38px] text-ink">
          {submission.app.name} to {submission.platform === "IOS" ? "App Store Connect" : "Google Play"}
        </Text>
        <PhaseLamps phases={statusLamps(submission.status)} size="row" />
        <Text className="text-[15px] leading-[21px] text-ink-2">{storeNote(submission)}</Text>
        {submission.error?.message ? (
          <View className="rounded-2xl bg-alarm/10 p-4">
            <Text className="font-mono text-[13px] leading-[19px] text-alarm-ink" selectable>
              {submission.error.message}
            </Text>
          </View>
        ) : null}
        <View className="gap-3">
          {submission.logFiles.length ? (
            <Button
              label="Open logs"
              variant="primary"
              onPress={() => routes.submissionLogs(projectId, submission.id)}
            />
          ) : null}
          {submission.canRetry && retryWindowOpen ? (
            <Button
              label="Retry submission"
              pending={retry.isPending}
              pendingLabel="Retrying"
              onPress={() => confirm("retry")}
            />
          ) : null}
          {active ? (
            <Button
              label="Cancel submission"
              variant="destructive"
              pending={cancel.isPending}
              pendingLabel="Canceling"
              onPress={() => confirm("cancel")}
            />
          ) : null}
        </View>
        {submission.status === "ERRORED" && !submission.canRetry ? (
          <Text className="text-[13px] leading-[18px] text-ink-3">
            Expo doesn&apos;t allow a retry for this submission. Fix the cause, then submit again with eas submit.
          </Text>
        ) : null}
      </View>

      <SectionTitle>Submission</SectionTitle>
      <FactGroup>
        <Fact label="Platform" value={platformLabel(submission.platform)} />
        <Fact label="Track" value={submission.androidConfig?.track} />
        <Fact label="Release status" value={submission.androidConfig?.releaseStatus?.toLowerCase()} />
        <Fact
          label="Rollout"
          value={
            submission.androidConfig?.rollout != null
              ? `${Math.round(submission.androidConfig.rollout * 100)}%`
              : undefined
          }
        />
        <Fact label="App Store Connect app" value={submission.iosConfig?.ascAppIdentifier} mono />
        <Fact label="Started by" value={submission.initiatingActor?.displayName} />
        <Fact label="Created" value={dateTime(submission.createdAt)} />
        <Fact label="Completed" value={dateTime(submission.completedAt)} />
      </FactGroup>

      {submission.submittedBuild ? (
        <>
          <SectionTitle>Build</SectionTitle>
          <FactGroup>
            <Fact
              label="Submitted build"
              value={[
                submission.submittedBuild.appVersion,
                submission.submittedBuild.appBuildVersion
                  ? `(${submission.submittedBuild.appBuildVersion})`
                  : "",
                submission.submittedBuild.buildProfile
                  ? `· ${submission.submittedBuild.buildProfile}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ") || "Open build"}
              onPress={() => routes.build(projectId, submission.submittedBuild!.id)}
            />
          </FactGroup>
        </>
      ) : null}

      <View className="px-5 pt-8 android:px-4">
        <Button
          label="Open in Expo"
          onPress={() =>
            void WebBrowser.openBrowserAsync(expoUrls.submission(submission.app, submission.id))
          }
        />
      </View>
    </ScrollView>
  );
}
