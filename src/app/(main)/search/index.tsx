import { Stack } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";

import { useProjects } from "@/api/hooks/use-projects";
import { ProjectIcon } from "@/components/project-icon";
import { EmptyState } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { relativeTime } from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";

export default function SearchScreen() {
  const [queryText, setQueryText] = useState("");
  const query = useProjects(queryText, "LATEST_ACTIVITY_TIME");
  const routes = useDetailRoutes();
  const projects = query.data?.pages.flatMap((page) => page.projects) ?? [];
  return (
    <View className="flex-1 bg-ground">
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: "Projects",
            autoCapitalize: "none",
            onChangeText: (event) => setQueryText(event.nativeEvent.text),
          },
        }}
      />
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="pb-28 pt-2"
        ListEmptyComponent={
          !query.isPending ? (
            <EmptyState title="No results" body="Search projects on the active account by name or slug." />
          ) : undefined
        }
        renderItem={({ item }) => (
          <StatusRow
            leading={<ProjectIcon project={item} />}
            title={item.name}
            subtitle={item.fullName}
            meta={item.latestActivity ? relativeTime(item.latestActivity) : undefined}
            onPress={() => routes.project(item.id)}
          />
        )}
      />
    </View>
  );
}
