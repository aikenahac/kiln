import { getBuilds } from "@/api/services/core";
import { getSubmissions } from "@/api/services/submissions";
import { getChannels, getUpdateGroups, type UpdateGroup } from "@/api/services/updates";
import { getWorkflowRuns } from "@/api/services/workflows";
import type { Build, Channel, Submission, WorkflowRun } from "@/types/api";

export type Section<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function section<T>(promise: Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

export type ProjectSummaryData = {
  latestBuild: Section<Build | undefined>;
  latestSubmission: Section<Submission | undefined>;
  latestUpdate: Section<UpdateGroup | undefined>;
  channels: Section<Channel[]>;
  latestRun: Section<WorkflowRun | undefined>;
};

/**
 * One small read per section for the project hub. Sections fail on their own
 * so a token without, say, workflow access still sees builds.
 */
export async function getProjectSummary(
  token: string,
  appId: string,
  signal?: AbortSignal,
): Promise<ProjectSummaryData> {
  const [latestBuild, latestSubmission, latestUpdate, channels, latestRun] =
    await Promise.all([
      section(getBuilds(token, appId, 0, undefined, signal, 1).then((items) => items[0])),
      section(getSubmissions(token, appId, 0, {}, signal, 1).then((items) => items[0])),
      section(getUpdateGroups(token, appId, 0, {}, signal, 1).then((groups) => groups[0])),
      section(getChannels(token, appId, signal)),
      section(getWorkflowRuns(token, appId, { first: 1 }, signal).then((page) => page.items[0])),
    ]);
  return { latestBuild, latestSubmission, latestUpdate, channels, latestRun };
}
