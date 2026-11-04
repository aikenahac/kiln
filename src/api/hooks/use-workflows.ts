import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/api/keys";
import { nextCursor } from "@/api/pagination";
import { usePollInterval } from "@/api/hooks/use-poll-interval";
import { isActiveStatus } from "@/api/polling";
import {
  cancelWorkflowRun,
  getWorkflowRun,
  getWorkflowRuns,
  getWorkflows,
  retryWorkflowRun,
  runWorkflowFromGitRef,
} from "@/api/services/workflows";
import { useAuth } from "@/providers/auth-provider";
import type { WorkflowRunStatus } from "@/types/api";

export function useWorkflows(projectId: string) {
  const { token, account } = useAuth();
  return useQuery({
    queryKey: queryKeys.workflows(account?.id ?? "none", projectId),
    enabled: Boolean(token && account && projectId),
    queryFn: ({ signal }) => getWorkflows(token!, projectId, signal),
  });
}

export function useWorkflowRuns(
  projectId: string,
  filter: { status?: WorkflowRunStatus; workflowId?: string } = {},
) {
  const { token, account } = useAuth();
  const interval = usePollInterval(true);
  return useInfiniteQuery({
    queryKey: queryKeys.workflowRuns(
      account?.id ?? "none",
      projectId,
      JSON.stringify(filter),
    ),
    enabled: Boolean(token && account && projectId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getWorkflowRuns(token!, projectId, { ...filter, after: pageParam }, signal),
    getNextPageParam: (page) => nextCursor(page.pageInfo),
    refetchInterval: (query) =>
      query.state.data?.pages[0]?.items.some((run) => isActiveStatus(run.status))
        ? interval
        : false,
  });
}

export function useWorkflowRun(projectId: string, runId: string) {
  const { token, account } = useAuth();
  const interval = usePollInterval(true);
  return useQuery({
    queryKey: queryKeys.workflowRun(account?.id ?? "none", projectId, runId),
    enabled: Boolean(token && account && runId),
    queryFn: ({ signal }) => getWorkflowRun(token!, runId, signal),
    refetchInterval: (query) =>
      isActiveStatus(query.state.data?.status) ? interval : false,
  });
}

export function useWorkflowActions(projectId: string) {
  const { token, account } = useAuth();
  const client = useQueryClient();
  const invalidate = () =>
    client.invalidateQueries({
      predicate: (query) =>
        (query.queryKey[0] === "workflowRuns" ||
          query.queryKey[0] === "workflowRun") &&
        query.queryKey[1] === account?.id &&
        query.queryKey[2] === projectId,
    });
  return {
    cancel: useMutation({
      mutationFn: (runId: string) => cancelWorkflowRun(token!, runId),
      onSuccess: invalidate,
    }),
    retry: useMutation({
      mutationFn: (input: { runId: string; fromFailedJobs: boolean }) =>
        retryWorkflowRun(token!, input.runId, input.fromFailedJobs),
      onSuccess: invalidate,
    }),
    run: useMutation({
      mutationFn: (input: { fileName: string; gitRef: string }) =>
        runWorkflowFromGitRef(token!, projectId, input.fileName, input.gitRef),
      onSuccess: invalidate,
    }),
  };
}
