import { router, useSegments } from "expo-router";
import { useMemo } from "react";

export type DetailTab = "now" | "projects" | "activity";

/**
 * Detail screens are mounted in the Now, Projects and Activity stacks so a
 * push stays inside the current tab. Other tabs open details in Projects.
 */
export function useDetailRoutes() {
  const segments = useSegments();
  const current = segments[1];
  const tab: DetailTab =
    current === "now" || current === "activity" ? current : "projects";
  return useMemo(
    () => ({
      build: (projectId: string, id: string) =>
        router.push({ pathname: `/(main)/${tab}/build/[id]`, params: { id, projectId } }),
      buildLogs: (projectId: string, id: string) =>
        router.push({ pathname: `/(main)/${tab}/build/[id]/logs`, params: { id, projectId } }),
      submission: (projectId: string, id: string) =>
        router.push({ pathname: `/(main)/${tab}/submission/[id]`, params: { id, projectId } }),
      submissionLogs: (projectId: string, id: string) =>
        router.push({ pathname: `/(main)/${tab}/submission/[id]/logs`, params: { id, projectId } }),
      run: (projectId: string, id: string) =>
        router.push({ pathname: `/(main)/${tab}/run/[id]`, params: { id, projectId } }),
      job: (projectId: string, runId: string, jobId: string) =>
        router.push({
          pathname: `/(main)/${tab}/run/[id]/job/[jobId]`,
          params: { id: runId, jobId, projectId },
        }),
      update: (projectId: string, group: string) =>
        router.push({ pathname: `/(main)/${tab}/update/[id]`, params: { id: group, projectId } }),
      project: (id: string) =>
        router.push({ pathname: "/(main)/projects/[id]", params: { id } }),
    }),
    [tab],
  );
}
