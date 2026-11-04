import {
  CANCEL_WORKFLOW_RUN,
  CREATE_WORKFLOW_RUN_FROM_GIT_REF,
  RETRY_WORKFLOW_RUN,
  WORKFLOW_REVISION_FROM_GIT_REF,
  WORKFLOW_RUN,
  WORKFLOW_RUNS,
  WORKFLOWS,
} from "@/api/documents/resources";
import { notFound } from "@/api/services/core";
import { graphqlRequest } from "@/api/transport";
import type {
  Page,
  PageInfo,
  Workflow,
  WorkflowRun,
  WorkflowRunDetail,
  WorkflowRunStatus,
} from "@/types/api";

export async function getWorkflows(
  token: string,
  appId: string,
  signal?: AbortSignal,
): Promise<Workflow[]> {
  const result = await graphqlRequest<{
    app: { byId: { workflows: Workflow[] } | null };
  }>(token, WORKFLOWS, { appId }, { signal });
  return result.app.byId?.workflows ?? [];
}

export async function getWorkflowRuns(
  token: string,
  appId: string,
  options: {
    after?: string;
    status?: WorkflowRunStatus;
    workflowId?: string;
    first?: number;
  } = {},
  signal?: AbortSignal,
): Promise<Page<WorkflowRun>> {
  const filter =
    options.status || options.workflowId
      ? { status: options.status, workflowId: options.workflowId }
      : null;
  const result = await graphqlRequest<{
    app: {
      byId: {
        workflowRunsPaginated: {
          edges: { node: WorkflowRun }[];
          pageInfo: PageInfo;
        };
      } | null;
    };
  }>(
    token,
    WORKFLOW_RUNS,
    { appId, first: options.first ?? 25, after: options.after ?? null, filter },
    { signal },
  );
  const connection = result.app.byId?.workflowRunsPaginated;
  return {
    items: connection?.edges.map((edge) => edge.node) ?? [],
    pageInfo: connection?.pageInfo ?? { hasNextPage: false },
  };
}

export async function getWorkflowRun(
  token: string,
  workflowRunId: string,
  signal?: AbortSignal,
): Promise<WorkflowRunDetail> {
  const result = await graphqlRequest<{
    workflowRuns: {
      byId:
        | (Omit<WorkflowRunDetail, "app" | "workflow"> & {
            workflow: WorkflowRunDetail["workflow"] & {
              app: WorkflowRunDetail["app"];
            };
          })
        | null;
    };
  }>(token, WORKFLOW_RUN, { workflowRunId }, { signal });
  const run = result.workflowRuns.byId;
  if (!run) throw notFound("This workflow run");
  const { app, ...workflow } = run.workflow;
  return { ...run, workflow, app };
}

export async function cancelWorkflowRun(
  token: string,
  workflowRunId: string,
): Promise<void> {
  await graphqlRequest(
    token,
    CANCEL_WORKFLOW_RUN,
    { workflowRunId },
    { attempts: 1 },
  );
}

export async function retryWorkflowRun(
  token: string,
  workflowRunId: string,
  fromFailedJobs: boolean,
): Promise<{ id: string }> {
  const result = await graphqlRequest<{
    workflowRun: { retryWorkflowRun: { id: string } };
  }>(
    token,
    RETRY_WORKFLOW_RUN,
    { workflowRunId, fromFailedJobs },
    { attempts: 1 },
  );
  return result.workflowRun.retryWorkflowRun;
}

/**
 * Mirrors `eas workflow:run --ref`: resolve the workflow file at a git ref on
 * Expo's side, then start a run from that revision. Requires the project's
 * GitHub repository to be connected in Expo.
 */
export async function runWorkflowFromGitRef(
  token: string,
  appId: string,
  fileName: string,
  gitRef: string,
): Promise<{ id: string }> {
  const revision = await graphqlRequest<{
    workflowRevision: { getOrCreateWorkflowRevisionFromGitRef: { id: string } };
  }>(
    token,
    WORKFLOW_REVISION_FROM_GIT_REF,
    { appId, fileName, gitRef },
    { attempts: 1 },
  );
  const result = await graphqlRequest<{
    workflowRun: { createWorkflowRunFromGitRef: { id: string } };
  }>(
    token,
    CREATE_WORKFLOW_RUN_FROM_GIT_REF,
    {
      workflowRevisionId:
        revision.workflowRevision.getOrCreateWorkflowRevisionFromGitRef.id,
      gitRef,
      inputs: null,
    },
    { attempts: 1 },
  );
  return result.workflowRun.createWorkflowRunFromGitRef;
}
