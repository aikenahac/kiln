import type {
  Build,
  Platform,
  ProjectSummary,
  SubmissionStatus,
  WorkflowJobStatus,
  WorkflowRunStatus,
} from "@/types/api";

export type RowStatus = "done" | "live" | "queued" | "failed" | "canceled";

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace("in progress", "building")
    .replace("errored", "failed");
}

export function relativeTime(date: string): string {
  const elapsed = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.round(elapsed / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function dateTime(date?: string | null): string | undefined {
  if (!date) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function duration(seconds?: number | null): string {
  if (!seconds || seconds < 0) return "—";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

export function secondsBetween(
  start?: string | null,
  end?: string | null,
): number | undefined {
  if (!start || !end) return undefined;
  const value = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
  return value >= 0 ? value : undefined;
}

export function platformLabel(platform: Platform | string): string {
  return platform === "IOS" || platform === "ios"
    ? "iOS"
    : platform === "ANDROID" || platform === "android"
      ? "Android"
      : platform;
}

export function buildTitle(build: Pick<Build, "app" | "platform">): string {
  return `${build.app.name} for ${platformLabel(build.platform)}`;
}

export function buildStatus(build: Pick<Build, "status">): RowStatus {
  if (build.status === "ERRORED") return "failed";
  if (build.status === "IN_PROGRESS") return "live";
  if (
    build.status === "IN_QUEUE" ||
    build.status === "NEW" ||
    build.status === "PENDING_CANCEL"
  )
    return "queued";
  if (build.status === "CANCELED") return "canceled";
  return "done";
}

export function submissionRowStatus(status: SubmissionStatus): RowStatus {
  switch (status) {
    case "ERRORED":
      return "failed";
    case "IN_PROGRESS":
      return "live";
    case "IN_QUEUE":
    case "AWAITING_BUILD":
      return "queued";
    case "CANCELED":
      return "canceled";
    case "FINISHED":
      return "done";
  }
}

export function submissionLabel(status: SubmissionStatus): string {
  switch (status) {
    case "AWAITING_BUILD":
      return "Waiting for build";
    case "IN_QUEUE":
      return "In queue";
    case "IN_PROGRESS":
      return "Uploading";
    case "FINISHED":
      return "Uploaded";
    case "ERRORED":
      return "Failed";
    case "CANCELED":
      return "Canceled";
  }
}

export function runRowStatus(
  status: WorkflowRunStatus | WorkflowJobStatus,
): RowStatus {
  switch (status) {
    case "FAILURE":
      return "failed";
    case "IN_PROGRESS":
    case "PENDING_CANCEL":
      return "live";
    case "NEW":
    case "WAITING":
    case "ACTION_REQUIRED":
      return "queued";
    case "CANCELED":
    case "SKIPPED":
      return "canceled";
    case "SUCCESS":
      return "done";
  }
}

export function runLabel(status: WorkflowRunStatus | WorkflowJobStatus): string {
  switch (status) {
    case "ACTION_REQUIRED":
      return "Needs approval";
    case "IN_PROGRESS":
      return "Running";
    case "PENDING_CANCEL":
      return "Canceling";
    case "SUCCESS":
      return "Succeeded";
    case "FAILURE":
      return "Failed";
    default:
      return statusLabel(status).replace(/^./, (first) => first.toUpperCase());
  }
}

export function shortHash(hash?: string | null): string | undefined {
  return hash ? hash.slice(0, 7) : undefined;
}

// expo.dev page URLs, as built by eas-cli build/utils/url.ts and
// submit/utils/urls.ts.
const WEBSITE = "https://expo.dev";

export function projectUrl(
  project: Pick<ProjectSummary, "slug" | "ownerAccount">,
  page?: string,
): string {
  const base = `${WEBSITE}/accounts/${encodeURIComponent(project.ownerAccount.name)}/projects/${encodeURIComponent(project.slug)}`;
  return page ? `${base}/${page}` : base;
}

export const expoUrls = {
  project: (project: Pick<ProjectSummary, "slug" | "ownerAccount">) =>
    projectUrl(project),
  build: (project: Pick<ProjectSummary, "slug" | "ownerAccount">, id: string) =>
    projectUrl(project, `builds/${encodeURIComponent(id)}`),
  submission: (
    project: Pick<ProjectSummary, "slug" | "ownerAccount">,
    id: string,
  ) => projectUrl(project, `submissions/${encodeURIComponent(id)}`),
  updateGroup: (
    project: Pick<ProjectSummary, "slug" | "ownerAccount">,
    group: string,
  ) => projectUrl(project, `updates/${encodeURIComponent(group)}`),
  workflowRun: (
    project: Pick<ProjectSummary, "slug" | "ownerAccount">,
    id: string,
  ) => projectUrl(project, `workflows/${encodeURIComponent(id)}`),
  hosting: (project: Pick<ProjectSummary, "slug" | "ownerAccount">) =>
    projectUrl(project, "hosting/deployments"),
  github: (project: Pick<ProjectSummary, "slug" | "ownerAccount">) =>
    projectUrl(project, "github"),
  billing: (accountName: string) =>
    `${WEBSITE}/accounts/${encodeURIComponent(accountName)}/settings/billing`,
  accountSettings: (accountName: string) =>
    `${WEBSITE}/accounts/${encodeURIComponent(accountName)}/settings`,
};

/**
 * Direct install link for an internal-distribution build, as eas-cli's
 * getInternalDistributionInstallUrl builds it. iOS uses the itms-services
 * manifest; Android uses the APK URL. Simulator and store builds have none.
 */
export function internalInstallUrl(
  build: Pick<Build, "id" | "platform" | "distribution" | "isForIosSimulator" | "artifacts"> & {
    app: { id: string };
  },
): string | undefined {
  if (build.distribution !== "INTERNAL" || build.isForIosSimulator) return undefined;
  if (build.platform === "IOS")
    return `itms-services://?action=download-manifest;url=https://api.expo.dev/v2/projects/${build.app.id}/builds/${build.id}/manifest.plist`;
  const url = build.artifacts?.buildUrl;
  return url && /\.apk(\?|$)/i.test(url) ? url : undefined;
}
