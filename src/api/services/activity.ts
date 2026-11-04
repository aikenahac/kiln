import { getBuilds, getProjects } from "@/api/services/core";
import { getSubmissions } from "@/api/services/submissions";
import { getUpdateGroups, type UpdateGroup } from "@/api/services/updates";
import { getWorkflowRuns } from "@/api/services/workflows";
import type { Build, Project, Submission, WorkflowRun } from "@/types/api";

export type ActivityItem =
  | { kind: "build"; id: string; time: string; project: Project; build: Build }
  | { kind: "submission"; id: string; time: string; project: Project; submission: Submission }
  | { kind: "update"; id: string; time: string; project: Project; group: UpdateGroup }
  | { kind: "run"; id: string; time: string; project: Project; run: WorkflowRun };

export type ActivityKind = ActivityItem["kind"];

export type RecentActivity = {
  projects: Project[];
  items: ActivityItem[];
  /** Sources that failed for some project, e.g. a token without workflow access. */
  partialFailures: number;
};

/**
 * A bounded read: the N most recently active projects (Expo's
 * LATEST_ACTIVITY_TIME sort) and the first page of each source per project.
 * Never pages through history.
 */
export async function getRecentActivity(
  token: string,
  accountId: string,
  options: { projects: number; perSource: number; windowDays?: number },
  signal?: AbortSignal,
): Promise<RecentActivity> {
  const { projects } = await getProjects(
    token,
    accountId,
    { sort: "LATEST_ACTIVITY_TIME", first: options.projects },
    signal,
  );
  let partialFailures = 0;
  const soft = <T>(promise: Promise<T[]>): Promise<T[]> =>
    promise.catch((error: unknown) => {
      if (signal?.aborted) throw error;
      partialFailures += 1;
      return [];
    });
  const perProject = await Promise.all(
    projects.map(async (project): Promise<ActivityItem[]> => {
      const [builds, submissions, groups, runs] = await Promise.all([
        soft(getBuilds(token, project.id, 0, undefined, signal, options.perSource)),
        soft(getSubmissions(token, project.id, 0, {}, signal, options.perSource)),
        soft(getUpdateGroups(token, project.id, 0, {}, signal, options.perSource)),
        soft(
          getWorkflowRuns(token, project.id, { first: options.perSource }, signal).then(
            (page) => page.items,
          ),
        ),
      ]);
      return [
        ...builds.map((build): ActivityItem => ({
          kind: "build",
          id: `build:${build.id}`,
          time: build.updatedAt,
          project,
          build,
        })),
        ...submissions.map((submission): ActivityItem => ({
          kind: "submission",
          id: `submission:${submission.id}`,
          time: submission.updatedAt,
          project,
          submission,
        })),
        ...groups.map((group): ActivityItem => ({
          kind: "update",
          id: `update:${group.group}`,
          time: group.updates[0]!.createdAt,
          project,
          group,
        })),
        ...runs.map((run): ActivityItem => ({
          kind: "run",
          id: `run:${run.id}`,
          time: run.updatedAt,
          project,
          run,
        })),
      ];
    }),
  );
  const cutoff = options.windowDays
    ? Date.now() - options.windowDays * 86_400_000
    : -Infinity;
  return {
    projects,
    partialFailures,
    items: perProject
      .flat()
      .filter((item) => new Date(item.time).getTime() >= cutoff)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  };
}
