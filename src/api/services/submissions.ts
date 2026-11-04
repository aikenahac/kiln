import {
  CANCEL_SUBMISSION,
  RETRY_SUBMISSION,
  SUBMISSION_BY_ID,
  SUBMISSIONS,
} from "@/api/documents/resources";
import { notFound } from "@/api/services/core";
import { graphqlRequest } from "@/api/transport";
import type { Platform, Submission, SubmissionStatus } from "@/types/api";

export const SUBMISSION_PAGE_SIZE = 30;

export type SubmissionFilter = {
  platform?: Platform;
  status?: SubmissionStatus;
};

export async function getSubmissions(
  token: string,
  appId: string,
  offset = 0,
  filter: SubmissionFilter = {},
  signal?: AbortSignal,
  limit = SUBMISSION_PAGE_SIZE,
): Promise<Submission[]> {
  const result = await graphqlRequest<{
    app: { byId: { submissions: Submission[] } | null };
  }>(token, SUBMISSIONS, { appId, offset, limit, filter }, { signal });
  return result.app.byId?.submissions ?? [];
}

export async function getSubmission(
  token: string,
  submissionId: string,
  signal?: AbortSignal,
): Promise<Submission> {
  const result = await graphqlRequest<{
    submissions: { byId: Submission | null };
  }>(token, SUBMISSION_BY_ID, { submissionId }, { signal });
  if (!result.submissions.byId) throw notFound("This submission");
  return result.submissions.byId;
}

export async function retrySubmission(
  token: string,
  submissionId: string,
): Promise<{ id: string; status: SubmissionStatus }> {
  const result = await graphqlRequest<{
    submission: {
      retrySubmission: {
        submission: { id: string; status: SubmissionStatus };
      };
    };
  }>(
    token,
    RETRY_SUBMISSION,
    { parentSubmissionId: submissionId },
    { attempts: 1 },
  );
  return result.submission.retrySubmission.submission;
}

export async function cancelSubmission(
  token: string,
  submissionId: string,
): Promise<{ id: string; status: SubmissionStatus }> {
  const result = await graphqlRequest<{
    submission: {
      cancelSubmission: { id: string; status: SubmissionStatus };
    };
  }>(token, CANCEL_SUBMISSION, { submissionId }, { attempts: 1 });
  return result.submission.cancelSubmission;
}
