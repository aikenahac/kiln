import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/keys";
import { nextCursor } from "@/api/pagination";
import {
  getProject,
  getProjects,
  type ProjectSort,
} from "@/api/services/core";
import { getProjectSummary } from "@/api/services/summary";
import { useAuth } from "@/providers/auth-provider";

export function useProjects(search = "", sort: ProjectSort = "NAME") {
  const { token, account } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.projects(account?.id ?? "none", search, sort),
    enabled: Boolean(token && account),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getProjects(token!, account!.id, { after: pageParam, search, sort }, signal),
    getNextPageParam: (page) => nextCursor(page.pageInfo),
  });
}

export function useProject(projectId: string) {
  const { token, account } = useAuth();
  return useQuery({
    queryKey: queryKeys.project(account?.id ?? "none", projectId),
    enabled: Boolean(token && account && projectId),
    queryFn: ({ signal }) => getProject(token!, projectId, signal),
    staleTime: 60_000,
  });
}

export function useProjectSummary(projectId: string) {
  const { token, account } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.project(account?.id ?? "none", projectId), "summary"],
    enabled: Boolean(token && account && projectId),
    queryFn: ({ signal }) => getProjectSummary(token!, projectId, signal),
  });
}
