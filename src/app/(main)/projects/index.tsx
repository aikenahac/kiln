import { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";

import { useProjects } from "@/api/hooks/use-projects";
import type { ProjectSort } from "@/api/services/core";
import { Icon } from "@/components/icon";
import { ProjectIcon } from "@/components/project-icon";
import { AccountPill, Chips, EmptyState, ErrorState } from "@/components/screen-parts";
import { relativeTime } from "@/lib/format";
import { useFavorites } from "@/lib/preferences";
import { useDetailRoutes } from "@/lib/routes";
import { usePalette } from "@/providers/theme-provider";
import type { Project } from "@/types/api";

const sorts = ["Recent", "Name", "Favorites"] as const;
type Sort = (typeof sorts)[number];
const apiSort: Record<Sort, ProjectSort> = {
  Recent: "LATEST_ACTIVITY_TIME",
  Name: "NAME",
  Favorites: "NAME",
};

export default function ProjectsScreen() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = useState<Sort>("Recent");
  const query = useProjects(deferredSearch, apiSort[sort]);
  const colors = usePalette();
  const routes = useDetailRoutes();
  const { favorites, toggle } = useFavorites();
  const projects = useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.projects) ?? [];
    return sort === "Favorites" ? all.filter((project) => favorites.includes(project.id)) : all;
  }, [favorites, query.data, sort]);

  const renderItem = ({ item }: { item: Project }) => {
    const favorite = favorites.includes(item.id);
    return (
      <Pressable
        onPress={() => routes.project(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.fullName}${favorite ? ", favorite" : ""}`}
        className="min-h-[76px] flex-row items-center gap-3 px-5 py-3 active:bg-raised-2 android:px-4"
      >
        <ProjectIcon project={item} />
        <View className="min-w-0 flex-1">
          <Text className="text-[17px] font-semibold text-ink" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="mt-0.5 text-[13px] text-ink-2" numberOfLines={1}>
            {item.fullName}
            {item.latestActivity ? ` · active ${relativeTime(item.latestActivity)}` : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => toggle(item.id)}
          className="h-12 w-12 items-center justify-center"
          accessibilityRole="button"
          accessibilityState={{ selected: favorite }}
          accessibilityLabel={favorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
        >
          <Icon name={favorite ? "starFill" : "star"} size={18} color={favorite ? "liveInk" : "ink3"} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <FlatList
      className="flex-1 bg-ground"
      data={projects}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={colors.ink2}
        />
      }
      contentContainerClassName="pb-28"
      ListHeaderComponent={
        <View className="gap-4 pb-3 pt-3">
          <View className="gap-4 px-5 android:px-4">
            <AccountPill />
            <Text className="text-[34px] font-bold leading-[41px] text-ink android:text-[32px]">
              Projects
            </Text>
            <View className="h-11 flex-row items-center gap-2 rounded-field bg-raised-2 px-4">
              <Icon name="search" size={15} color="ink3" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search projects"
                placeholderTextColor={colors.ink2}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-[17px] text-ink"
                accessibilityLabel="Search projects"
              />
            </View>
          </View>
          <Chips options={sorts} value={sort} onChange={setSort} />
          {query.error ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : null}
        </View>
      }
      ListEmptyComponent={
        !query.isPending && !query.error ? (
          <EmptyState
            title={sort === "Favorites" ? "No favorites" : "No projects"}
            body={
              sort === "Favorites"
                ? "Star a project to keep it here and on Now."
                : search
                  ? "No project matches this search."
                  : "This account has no Expo projects this token can see."
            }
          />
        ) : undefined
      }
    />
  );
}
