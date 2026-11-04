import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";
import { Text, View } from "react-native";

import { useWorkerDeployments } from "@/api/hooks/use-account";
import { useProject } from "@/api/hooks/use-projects";
import { ResourceList } from "@/components/resource-list";
import { Fact, FactGroup, OpenInExpo, SectionTitle } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { expoUrls, relativeTime } from "@/lib/format";

export default function ProjectHostingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const query = useWorkerDeployments(id);
  const deployments = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const aliases = query.data?.pages[0]?.aliases ?? [];
  return (
    <ResourceList
      data={deployments}
      keyExtractor={(deployment) => deployment.id}
      query={query}
      header={
        aliases.length ? (
          <View>
            <SectionTitle>Aliases</SectionTitle>
            <FactGroup>
              {aliases.map((alias) => (
                <Fact
                  key={alias.id}
                  label={alias.aliasName ?? "production"}
                  value={alias.url}
                  onPress={() => void WebBrowser.openBrowserAsync(alias.url)}
                />
              ))}
            </FactGroup>
            <SectionTitle>Deployments</SectionTitle>
          </View>
        ) : undefined
      }
      empty={{
        title: "No deployments",
        body: "Deploy a web export with eas deploy, and deployments appear here.",
      }}
      footer={
        <View>
          <Text className="px-5 pt-4 text-[13px] leading-[18px] text-ink-3 android:px-4">
            Promoting or deleting deployments isn&apos;t available here. Use eas deploy --prod or Expo.
          </Text>
          {project.data ? <OpenInExpo url={expoUrls.hosting(project.data)} /> : null}
        </View>
      }
      renderItem={(deployment) => (
        <StatusRow
          title={deployment.deploymentIdentifier}
          subtitle={[deployment.url.replace("https://", ""), deployment.initiatingActor?.displayName]
            .filter(Boolean)
            .join(" · ")}
          meta={relativeTime(deployment.createdAt)}
          onPress={() => void WebBrowser.openBrowserAsync(deployment.url)}
        />
      )}
    />
  );
}
