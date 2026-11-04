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
  cancelSubmission,
  getSubmission,
  getSubmissions,
  retrySubmission,
  SUBMISSION_PAGE_SIZE,
  type SubmissionFilter,
} from "@/api/services/submissions";
import { useAuth } from "@/providers/auth-provider";

export function useSubmissions(projectId: string, filter: SubmissionFilter = {}) {
  const { token, account } = useAuth();
  const interval = usePollInterval(true);
  return useInfiniteQuery({
    queryKey: queryKeys.submissions(
      account?.id ?? "none",
      projectId,
      JSON.stringify(filter),
    ),
    enabled: Boolean(token && account && projectId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getSubmissions(token!, projectId, pageParam, filter, signal),
    getNextPageParam: (page, pages) =>
      nextOffset(page.length, SUBMISSION_PAGE_SIZE, pages.length),
    refetchInterval: (query) =>
      query.state.data?.pages[0]?.some((item) => isActiveStatus(item.status))
        ? interval
        : false,
  });
}

export function useSubmission(projectId: string, submissionId: string) {
  const { token, account } = useAuth();
  const interval = usePollInterval(true);
  return useQuery({
    queryKey: queryKeys.submission(account?.id ?? "none", projectId, submissionId),
    enabled: Boolean(token && account && submissionId),
    queryFn: ({ signal }) => getSubmission(token!, submissionId, signal),
    refetchInterval: (query) =>
      isActiveStatus(query.state.data?.status) ? interval : false,
  });
}

export function useSubmissionActions(projectId: string, submissionId: string) {
  const { token, account } = useAuth();
  const client = useQueryClient();
  const invalidate = () =>
    client.invalidateQueries({
      predicate: (query) =>
        (query.queryKey[0] === "submissions" ||
          query.queryKey[0] === "submission") &&
        query.queryKey[1] === account?.id &&
        query.queryKey[2] === projectId,
    });
  const retry = useMutation({
    mutationFn: () => retrySubmission(token!, submissionId),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: () => cancelSubmission(token!, submissionId),
    onSuccess: invalidate,
  });
  return { retry, cancel };
}
