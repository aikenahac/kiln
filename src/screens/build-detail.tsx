import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";

import { isBuildActive, useBuild, useCancelBuild } from "@/api/hooks/use-builds";
import { useLogs, type LogSource } from "@/api/hooks/use-logs";
import { errorCopy } from "@/api/errors";
import { phasesFromSteps, statusLamps } from "@/api/logs";
import { PhaseLamps } from "@/components/phase-lamps";
import { ProjectIcon } from "@/components/project-icon";
import {
  Button,
  ErrorState,
  Fact,
  FactGroup,
  LoadingState,
  Note,
  SectionTitle,
} from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import {
  buildTitle,
  dateTime,
  duration,
  expoUrls,
  internalInstallUrl,
  platformLabel,
  relativeTime,
  secondsBetween,
  shortHash,
  statusLabel,
  submissionLabel,
  submissionRowStatus,
} from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";
import { usePalette } from "@/providers/theme-provider";

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export default function BuildDetailScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const routes = useDetailRoutes();
  const colors = usePalette();
  const buildQuery = useBuild(projectId, id);
  const build = buildQuery.data;
  const active = isBuildActive(build?.status);
  const source = useMemo<LogSource | undefined>(
    () =>
      build
        ? {
            kind: "build",
            id: build.id,
            urls: build.logFiles,
            active,
            realtime: { type: "BUILD", id: build.id },
            refreshUrls: async () =>
              (await buildQuery.refetch()).data?.logFiles ?? [],
          }
        : undefined,
    // buildQuery.refetch is stable; logFiles change when the build refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [build?.id, build?.logFiles, active],
  );
  const logs = useLogs(source);
  const cancel = useCancelBuild(projectId, id);
  const now = useNow(active);

  const phases = useMemo(() => {
    if (!build) return [];
    const fromLogs = logs.data ? phasesFromSteps(logs.data) : [];
    return fromLogs.length ? fromLogs : statusLamps(build.status);
  }, [build, logs.data]);

  // Signature haptics: selection on a phase change, success or reject on finish.
  const previous = useRef<string | null>(null);
  const signature = phases.map((phase) => `${phase.name}:${phase.state}`).join("|");
  useEffect(() => {
    if (!signature || !build) return;
    if (previous.current && previous.current !== signature) {
      if (Platform.OS === "android") {
        void Haptics.performAndroidHapticsAsync(
          build.status === "FINISHED"
            ? Haptics.AndroidHaptics.Confirm
            : build.status === "ERRORED"
              ? Haptics.AndroidHaptics.Reject
              : Haptics.AndroidHaptics.Segment_Tick,
        );
      } else if (build.status === "FINISHED") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (build.status === "ERRORED") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        void Haptics.selectionAsync();
      }
    }
    previous.current = signature;
  }, [build, signature]);

  if (buildQuery.isPending) return <LoadingState label="Loading build" />;
  if (buildQuery.error || !build)
    return (
      <ErrorState
        error={buildQuery.error ?? new Error("Build not found.")}
        retry={() => void buildQuery.refetch()}
      />
    );

  const dashboard = expoUrls.build(build.app, build.id);
  const install = internalInstallUrl(build);
  const installable =
    install &&
    ((build.platform === "IOS" && Platform.OS === "ios") ||
      (build.platform === "ANDROID" && Platform.OS === "android"));
  const elapsed = build.metrics?.buildDuration
    ? build.metrics.buildDuration
    : active
      ? (now - new Date(build.createdAt).getTime()) / 1000
      : secondsBetween(build.createdAt, build.completedAt);
  const failedStep = logs.data?.find((step) => step.result === "failed");

  const confirmCancel = () =>
    Alert.alert(
      "Cancel build?",
      `${build.app.ownerAccount.name} · ${build.app.name}\n${platformLabel(build.platform)} · ${build.buildProfile ?? "default"}`,
      [
        { text: "Keep building", style: "cancel" },
        {
          text: "Cancel build",
          style: "destructive",
          onPress: () =>
            cancel.mutate(undefined, {
              onError: (error) =>
                Alert.alert("Build not canceled", errorCopy(error)),
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
          refreshing={buildQuery.isRefetching}
          onRefresh={() => {
            void buildQuery.refetch();
            void logs.refetch();
          }}
          tintColor={colors.ink2}
        />
      }
    >
      <Stack.Screen options={{ title: build.app.name }} />
      <View className="gap-4 px-5 py-5 android:px-4">
        <View className="flex-row items-center gap-3">
          <ProjectIcon project={build.app} size="sm" />
          <Text
            className={`text-[13px] font-semibold ${build.status === "ERRORED" ? "text-alarm-ink" : active ? "text-live-ink" : "text-ink-2"}`}
          >
            {failedStep
              ? `Failed in ${failedStep.label}${elapsed ? ` after ${duration(elapsed)}` : ""}`
              : `${statusLabel(build.status).replace(/^./, (c) => c.toUpperCase())}${elapsed ? ` · ${duration(elapsed)}` : ""}`}
          </Text>
        </View>
        <Text className="text-[34px] font-bold leading-[38px] text-ink">
          {buildTitle(build)}
        </Text>
        {active ? (
          <Text
            className="text-[64px] font-black leading-[64px] tracking-[-1px] text-ink"
            style={{ fontVariant: ["tabular-nums"] }}
            accessibilityLabel={`Elapsed ${duration(elapsed)}`}
          >
            {duration(elapsed)}
          </Text>
        ) : null}
        <PhaseLamps phases={phases} size="hero" />
        {logs.live === "live" ? (
          <View className="flex-row items-center gap-2" accessibilityLiveRegion="polite">
            <View className="h-2.5 w-2.5 rounded-full bg-live" />
            <Text className="text-[13px] text-live-ink">Live. Phases update as Expo streams the log.</Text>
          </View>
        ) : null}
        {!logs.data && build.logFiles.length === 0 ? (
          <Text className="text-[13px] text-ink-3">
            Phases appear once Expo publishes this build&apos;s logs.
          </Text>
        ) : null}
        {build.status === "IN_QUEUE" || build.status === "NEW" ? (
          <Text className="text-[15px] text-ink-2" style={{ fontVariant: ["tabular-nums"] }}>
            {build.queuePosition ? `Position ${build.queuePosition} in queue` : "Queued"}
            {build.estimatedWaitTimeLeftSeconds
              ? ` · about ${Math.max(1, Math.ceil(build.estimatedWaitTimeLeftSeconds / 60))} min left`
              : ""}
          </Text>
        ) : null}
        {build.error ? (
          <View className="gap-2 rounded-2xl bg-alarm/10 p-4">
            <Text className="font-mono text-[13px] leading-[19px] text-alarm-ink" selectable>
              {build.error.message}
            </Text>
            {build.error.docsUrl ? (
              <Text
                className="text-[13px] font-semibold text-alarm-ink underline"
                onPress={() => void WebBrowser.openBrowserAsync(build.error!.docsUrl!)}
              >
                Read the Expo docs for {build.error.errorCode}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View className="gap-3">
          {build.logFiles.length ? (
            <Button
              label={failedStep ? `Open logs at ${failedStep.label}` : "Open logs"}
              variant="primary"
              onPress={() => routes.buildLogs(projectId, build.id)}
            />
          ) : null}
          {installable ? (
            <Button
              label="Install on this device"
              onPress={() => void Linking.openURL(install)}
            />
          ) : null}
          {active ? (
            <Button
              label="Cancel build"
              variant="destructive"
              pending={cancel.isPending}
              pendingLabel="Canceling"
              onPress={confirmCancel}
            />
          ) : null}
          <Button
            label="Share"
            onPress={() =>
              void Share.share({
                message: `${buildTitle(build)} · ${statusLabel(build.status)}\n${dashboard}`,
              })
            }
          />
        </View>
        {build.distribution === "STORE" && build.platform === "IOS" ? (
          <Text className="text-[13px] leading-[18px] text-ink-3">
            Store builds install through TestFlight or the App Store, not from here.
          </Text>
        ) : build.isForIosSimulator ? (
          <Text className="text-[13px] leading-[18px] text-ink-3">
            Simulator build. Download it on a Mac and drag it onto a simulator.
          </Text>
        ) : null}
      </View>

      <SectionTitle>Build</SectionTitle>
      <FactGroup>
        <Fact label="Profile" value={build.buildProfile} />
        <Fact
          label="Distribution"
          value={
            build.distribution
              ? `${statusLabel(build.distribution)}${build.isForIosSimulator ? " · simulator" : ""}`
              : undefined
          }
        />
        <Fact
          label="App version"
          value={[build.appVersion, build.appBuildVersion ? `(${build.appBuildVersion})` : ""]
            .filter(Boolean)
            .join(" ")}
        />
        <Fact label="Application ID" value={build.appIdentifier} mono />
        <Fact label="Runtime" value={build.runtime?.version} mono />
        <Fact label="SDK" value={build.sdkVersion} />
        <Fact label="Fingerprint" value={build.fingerprint?.hash.slice(0, 12)} mono />
      </FactGroup>

      <SectionTitle>Source</SectionTitle>
      <FactGroup>
        <Fact label="Commit" value={shortHash(build.gitCommitHash)} mono />
        <Fact label="Message" value={build.gitCommitMessage ?? build.message} />
        <Fact label="Started by" value={build.initiatingActor?.displayName} />
      </FactGroup>

      <SectionTitle>Timing</SectionTitle>
      <FactGroup>
        <Fact label="Created" value={dateTime(build.createdAt)} />
        <Fact label="Completed" value={dateTime(build.completedAt)} />
        <Fact
          label="Waited in queue"
          value={build.metrics?.buildQueueTime ? duration(build.metrics.buildQueueTime) : undefined}
        />
        <Fact
          label="Build time"
          value={build.metrics?.buildDuration ? duration(build.metrics.buildDuration) : undefined}
        />
        <Fact label="Artifacts expire" value={dateTime(build.expirationDate)} />
      </FactGroup>

      {build.artifacts?.applicationArchiveUrl ||
      build.artifacts?.buildArtifactsUrl ||
      build.artifacts?.xcodeBuildLogsUrl ? (
        <>
          <SectionTitle>Artifacts</SectionTitle>
          <FactGroup>
            <Fact
              label="Application archive"
              value={build.artifacts.applicationArchiveUrl ? "Download" : undefined}
              onPress={() =>
                void WebBrowser.openBrowserAsync(build.artifacts!.applicationArchiveUrl!)
              }
            />
            <Fact
              label="Build artifacts"
              value={build.artifacts.buildArtifactsUrl ? "Download" : undefined}
              onPress={() =>
                void WebBrowser.openBrowserAsync(build.artifacts!.buildArtifactsUrl!)
              }
            />
            <Fact
              label="Xcode logs"
              value={build.artifacts.xcodeBuildLogsUrl ? "Download" : undefined}
              onPress={() =>
                void WebBrowser.openBrowserAsync(build.artifacts!.xcodeBuildLogsUrl!)
              }
            />
          </FactGroup>
          <Note>Artifact links are signed by Expo and expire. Kiln never stores them.</Note>
        </>
      ) : null}

      {build.submissions.length ? (
        <>
          <SectionTitle>Submissions</SectionTitle>
          {build.submissions.map((submission) => (
            <StatusRow
              key={submission.id}
              title={`${platformLabel(submission.platform)} submission`}
              subtitle={submissionLabel(submission.status)}
              meta={relativeTime(submission.createdAt)}
              status={submissionRowStatus(submission.status)}
              onPress={() => routes.submission(projectId, submission.id)}
            />
          ))}
        </>
      ) : null}

      <View className="gap-3 px-5 pt-8 android:px-4">
        <Button label="Open in Expo" onPress={() => void WebBrowser.openBrowserAsync(dashboard)} />
        <Text className="text-[13px] leading-[18px] text-ink-3">
          Rebuilding needs your source code. Start a new build from a workflow in
          Workflows, or with eas build on your machine.
        </Text>
      </View>
    </ScrollView>
  );
}
