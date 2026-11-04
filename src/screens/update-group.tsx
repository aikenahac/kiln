import { Stack, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, Text, View } from "react-native";

import { useProject } from "@/api/hooks/use-projects";
import { useUpdateGroup } from "@/api/hooks/use-updates";
import {
  Button,
  ErrorState,
  Fact,
  FactGroup,
  LoadingState,
  Note,
  SectionTitle,
} from "@/components/screen-parts";
import { dateTime, expoUrls, platformLabel, relativeTime, shortHash } from "@/lib/format";

export default function UpdateGroupScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId: string }>();
  const query = useUpdateGroup(projectId, id);
  const project = useProject(projectId);
  if (query.isPending) return <LoadingState label="Loading update" />;
  if (query.error || !query.data?.length)
    return (
      <ErrorState
        error={query.error ?? new Error("This update group has no updates this token can see.")}
        retry={() => void query.refetch()}
      />
    );
  const updates = query.data;
  const first = updates[0]!;
  return (
    <ScrollView
      className="flex-1 bg-ground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-28"
    >
      <Stack.Screen options={{ title: "Update" }} />
      <View className="gap-2 px-5 py-5 android:px-4">
        <Text className="text-[13px] font-semibold text-ink-2">
          {first.branch.name} · {relativeTime(first.createdAt)}
        </Text>
        <Text className="text-[30px] font-bold leading-[36px] text-ink">
          {first.isRollBackToEmbedded ? "Roll back to embedded update" : (first.message ?? "No message")}
        </Text>
        {first.rolloutPercentage != null ? (
          <Text className="text-[15px] text-live-ink" style={{ fontVariant: ["tabular-nums"] }}>
            Rolling out to {first.rolloutPercentage}% of users
          </Text>
        ) : null}
      </View>
      <SectionTitle>Group</SectionTitle>
      <FactGroup>
        <Fact
          label="Group ID"
          value={first.group}
          mono
          onPress={() => void Clipboard.setStringAsync(first.group)}
        />
        <Fact label="Branch" value={first.branch.name} />
        <Fact label="Environment" value={first.environment} />
        <Fact label="Commit" value={shortHash(first.gitCommitHash)} mono />
        <Fact label="Published by" value={first.actor?.displayName} />
        <Fact label="Published" value={dateTime(first.createdAt)} />
      </FactGroup>
      <Note>Tap the group ID to copy it.</Note>
      <SectionTitle>Platforms</SectionTitle>
      <FactGroup>
        {updates.map((update) => (
          <Fact
            key={update.id}
            label={platformLabel(update.platform)}
            value={`Runtime ${update.runtimeVersion} · ${update.id.slice(0, 8)}`}
            mono
          />
        ))}
      </FactGroup>
      <Note>
        Republishing or rolling back needs eas update on your machine or a
        workflow. Rollout percentage on a channel is editable in Channels.
      </Note>
      {project.data ? (
        <View className="px-5 pt-6 android:px-4">
          <Button
            label="Open in Expo"
            onPress={() =>
              void WebBrowser.openBrowserAsync(expoUrls.updateGroup(project.data!, first.group))
            }
          />
        </View>
      ) : null}
    </ScrollView>
  );
}
