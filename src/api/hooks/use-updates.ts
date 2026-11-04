import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/api/keys";
import { nextOffset } from "@/api/pagination";
import {
  createBranch,
  createChannel,
  deleteBranch,
  deleteChannel,
  editChannelMapping,
  getBranches,
  getChannels,
  getUpdateGroup,
  getUpdateGroups,
  renameBranch,
  setChannelPaused,
  UPDATE_PAGE_SIZE,
} from "@/api/services/updates";
import { useAuth } from "@/providers/auth-provider";
import type { Platform } from "@/types/api";

export function useUpdateGroups(projectId: string, platform?: Platform) {
  const { token, account } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.updateGroups(
      account?.id ?? "none",
      projectId,
      platform ?? "all",
    ),
    enabled: Boolean(token && account && projectId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getUpdateGroups(
        token!,
        projectId,
        pageParam,
        platform ? { platform } : {},
        signal,
      ),
    // Pages are counted in groups before empty groups are dropped, so use the
    // page length the server returned rather than the filtered length.
    getNextPageParam: (page, pages) =>
      nextOffset(page.length, UPDATE_PAGE_SIZE, pages.length),
  });
}

export function useUpdateGroup(projectId: string, groupId: string) {
  const { token, account } = useAuth();
  return useQuery({
    queryKey: queryKeys.updateGroup(account?.id ?? "none", projectId, groupId),
    enabled: Boolean(token && account && groupId),
    queryFn: ({ signal }) => getUpdateGroup(token!, groupId, signal),
  });
}

export function useChannels(projectId: string) {
  const { token, account } = useAuth();
  return useQuery({
    queryKey: queryKeys.channels(account?.id ?? "none", projectId),
    enabled: Boolean(token && account && projectId),
    queryFn: ({ signal }) => getChannels(token!, projectId, signal),
  });
}

export function useBranches(projectId: string) {
  const { token, account } = useAuth();
  return useQuery({
    queryKey: queryKeys.branches(account?.id ?? "none", projectId),
    enabled: Boolean(token && account && projectId),
    queryFn: ({ signal }) => getBranches(token!, projectId, signal),
  });
}

export function useChannelActions(projectId: string) {
  const { token, account } = useAuth();
  const client = useQueryClient();
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({
        queryKey: queryKeys.channels(account?.id ?? "none", projectId),
      }),
      client.invalidateQueries({
        queryKey: queryKeys.branches(account?.id ?? "none", projectId),
      }),
    ]);
  };
  return {
    editMapping: useMutation({
      mutationFn: (input: { channelId: string; branchMapping: string }) =>
        editChannelMapping(token!, input.channelId, input.branchMapping),
      onSuccess: invalidate,
    }),
    createChannel: useMutation({
      mutationFn: (input: { name: string; branchMapping: string }) =>
        createChannel(token!, projectId, input.name, input.branchMapping),
      onSuccess: invalidate,
    }),
    deleteChannel: useMutation({
      mutationFn: (channelId: string) => deleteChannel(token!, channelId),
      onSuccess: invalidate,
    }),
    setPaused: useMutation({
      mutationFn: (input: { channelId: string; paused: boolean }) =>
        setChannelPaused(token!, input.channelId, input.paused),
      onSuccess: invalidate,
    }),
    createBranch: useMutation({
      mutationFn: (name: string) => createBranch(token!, projectId, name),
      onSuccess: invalidate,
    }),
    renameBranch: useMutation({
      mutationFn: (input: { branchId: string; name: string }) =>
        renameBranch(token!, input.branchId, input.name),
      onSuccess: invalidate,
    }),
    deleteBranch: useMutation({
      mutationFn: (branchId: string) => deleteBranch(token!, branchId),
      onSuccess: invalidate,
    }),
  };
}
