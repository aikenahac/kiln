import type { ReactElement } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";

import { EmptyState, ErrorState } from "@/components/screen-parts";
import { usePalette } from "@/providers/theme-provider";

type ListQuery = {
  isPending: boolean;
  isRefetching: boolean;
  error: unknown;
  refetch: () => unknown;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => unknown;
  dataUpdatedAt?: number;
};

/**
 * The list grammar shared by project resources: pull to refresh, cursor or
 * offset pagination, a header slot for chips, and empty/error copy. A failed
 * background refresh keeps the rows already on screen.
 */
export function ResourceList<T>({
  data,
  keyExtractor,
  renderItem,
  query,
  header,
  footer,
  empty,
}: {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  query: ListQuery;
  header?: ReactElement;
  footer?: ReactElement;
  empty: { title: string; body: string };
}) {
  const colors = usePalette();
  const showError = Boolean(query.error) && data.length === 0;
  return (
    <FlatList
      className="flex-1 bg-ground"
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-28"
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage?.();
      }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={colors.ink2}
        />
      }
      ListHeaderComponent={
        <View className="gap-3 pb-2 pt-2">
          {header}
          {query.error && data.length > 0 ? (
            <Text className="px-5 text-[13px] text-alarm-ink android:px-4">
              Refresh failed. Showing data from {query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString() : "earlier"}.
            </Text>
          ) : null}
          {showError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : null}
        </View>
      }
      ListEmptyComponent={
        !query.isPending && !query.error ? <EmptyState {...empty} /> : undefined
      }
      ListFooterComponent={
        <View>
          {query.isFetchingNextPage ? (
            <Text className="py-6 text-center text-[13px] text-ink-3">Loading more</Text>
          ) : null}
          {footer}
        </View>
      }
    />
  );
}
