import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/api/keys";
import { nextCursor } from "@/api/pagination";
import {
  createDeviceRegistration,
  deleteAppleDevice,
  getAccountMembers,
  getAppleDevices,
  getEnvironmentVariables,
  getWorkerDeployments,
  renameAppleDevice,
} from "@/api/services/account";
import { useAuth } from "@/providers/auth-provider";
import type { AppleDeviceClass } from "@/types/api";

export function useAppleDevices(deviceClass?: AppleDeviceClass) {
  const { token, account } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.devices(account?.id ?? "none", deviceClass ?? "all"),
    enabled: Boolean(token && account),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAppleDevices(token!, account!.id, { after: pageParam, deviceClass }, signal),
    getNextPageParam: (page) => nextCursor(page.pageInfo),
  });
}

export function useDeviceActions() {
  const { token, account } = useAuth();
  const client = useQueryClient();
  const invalidate = () =>
    client.invalidateQueries({
      queryKey: ["devices", account?.id ?? "none"],
    });
  return {
    rename: useMutation({
      mutationFn: (input: { id: string; name: string }) =>
        renameAppleDevice(token!, input.id, input.name),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteAppleDevice(token!, id),
      onSuccess: invalidate,
    }),
    register: useMutation({
      mutationFn: (appleTeamId: string) =>
        createDeviceRegistration(token!, account!.id, appleTeamId),
    }),
  };
}

export function useEnvironmentVariables(projectId: string, environment?: string) {
  const { token, account } = useAuth();
  return useQuery({
    queryKey: queryKeys.environment(
      account?.id ?? "none",
      projectId,
      environment ?? "all",
    ),
    enabled: Boolean(token && account && projectId),
    queryFn: ({ signal }) =>
      getEnvironmentVariables(token!, projectId, environment, signal),
  });
}

export function useWorkerDeployments(projectId: string) {
  const { token, account } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.hosting(account?.id ?? "none", projectId),
    enabled: Boolean(token && account && projectId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getWorkerDeployments(token!, projectId, pageParam, signal),
    getNextPageParam: (page) => nextCursor(page.pageInfo),
  });
}

export function useAccountMembers() {
  const { token, account } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.members(account?.id ?? "none"),
    enabled: Boolean(token && account),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAccountMembers(token!, account!.id, pageParam, signal),
    getNextPageParam: (page) => nextCursor(page.pageInfo),
  });
}
