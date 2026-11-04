import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/api/keys";
import { nextOffset } from "@/api/pagination";
import { usePollInterval } from "@/api/hooks/use-poll-interval";
import { isActiveStatus } from "@/api/polling";
import {
  BUILD_PAGE_SIZE,
  cancelBuild,
  getBuild,
  getBuilds,
  type BuildFilter,
} from "@/api/services/core";
import { useAuth } from "@/providers/auth-provider";
import type { Build, BuildWithSubmissions } from "@/types/api";

export function useBuilds(projectId: string, filter?: BuildFilter) {
  const { token, account } = useAuth();
  const filterKey = JSON.stringify(filter ?? {});
  const interval = usePollInterval(true);
  return useInfiniteQuery({
    queryKey: queryKeys.builds(account?.id ?? "none", projectId, filterKey),
    enabled: Boolean(token && account && projectId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getBuilds(token!, projectId, pageParam, filter, signal),
    getNextPageParam: (page, pages) =>
      nextOffset(page.length, BUILD_PAGE_SIZE, pages.length),
    refetchInterval: (query) =>
      query.state.data?.pages[0]?.some((build) => isActiveStatus(build.status))
        ? interval
        : false,
  });
}

export function useBuild(projectId: string, buildId: string) {
  const { token, account } = useAuth();
  const key = queryKeys.build(account?.id ?? "none", projectId, buildId);
  const interval = usePollInterval(true);
  return useQuery({
    queryKey: key,
    enabled: Boolean(token && account && buildId),
    queryFn: ({ signal }) => getBuild(token!, buildId, signal),
    refetchInterval: (query) =>
      isActiveStatus(query.state.data?.status) ? interval : false,
  });
}

export function useCancelBuild(projectId: string, buildId: string) {
  const { token, account } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => cancelBuild(token!, buildId),
    onSuccess: async (result) => {
      client.setQueryData(
        queryKeys.build(account!.id, projectId, buildId),
        (build: BuildWithSubmissions | undefined) =>
          build ? { ...build, status: result.status } : build,
      );
      await client.invalidateQueries({
        queryKey: ["builds", account!.id, projectId],
      });
    },
  });
}

export function isBuildActive(status?: Build["status"]): boolean {
  return isActiveStatus(status);
}
