import type {
  BuildStatus,
  SubmissionStatus,
  WorkflowJobStatus,
  WorkflowRunStatus,
} from "@/types/api";

const TERMINAL = new Set<BuildStatus>(["FINISHED", "ERRORED", "CANCELED"]);

export function shouldPollBuild(
  status: BuildStatus | undefined,
  focused: boolean,
  foreground: boolean,
  online: boolean,
): boolean {
  return Boolean(
    status && focused && foreground && online && !TERMINAL.has(status),
  );
}

const ACTIVE_STATUSES = new Set<string>([
  "NEW",
  "IN_QUEUE",
  "IN_PROGRESS",
  "PENDING_CANCEL",
  "AWAITING_BUILD",
  "WAITING",
  "ACTION_REQUIRED",
]);

export function isActiveStatus(
  status:
    | BuildStatus
    | SubmissionStatus
    | WorkflowRunStatus
    | WorkflowJobStatus
    | undefined,
): boolean {
  return status ? ACTIVE_STATUSES.has(status) : false;
}
