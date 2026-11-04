import {
  BUILD_BY_ID,
  BUILDS,
  CANCEL_BUILD,
  CURRENT_ACTOR,
  PROJECT_BY_ID,
  PROJECTS,
} from "@/api/documents/core";
import { KilnApiError } from "@/api/errors";
import { graphqlRequest } from "@/api/transport";
import type {
  Actor,
  Build,
  BuildStatus,
  BuildWithSubmissions,
  PageInfo,
  Platform,
  Project,
} from "@/types/api";

export const BUILD_PAGE_SIZE = 30;

export type ProjectSort = "LATEST_ACTIVITY_TIME" | "NAME";

export type BuildFilter = {
  platform?: Platform;
  status?: BuildStatus;
  distribution?: "INTERNAL" | "SIMULATOR" | "STORE";
  buildProfile?: string;
};

export function notFound(what: string): KilnApiError {
  return new KilnApiError({
    kind: "notFound",
    message: `${what} is not available to this token. It may have been deleted, or the token can't see it.`,
  });
}

export async function getCurrentActor(
  token: string,
  signal?: AbortSignal,
): Promise<Actor> {
  const result = await graphqlRequest<{ meActor: Actor | null }>(
    token,
    CURRENT_ACTOR,
    {},
    { signal, attempts: 1 },
  );
  if (!result.meActor) throw new Error("This token has no current Expo actor.");
  return result.meActor;
}

export async function getProjects(
  token: string,
  accountId: string,
  options: {
    after?: string;
    search?: string;
    sort?: ProjectSort;
    first?: number;
  } = {},
  signal?: AbortSignal,
): Promise<{ projects: Project[]; pageInfo: PageInfo }> {
  const result = await graphqlRequest<{
    account: {
      byId: {
        appsPaginated: {
          edges: { cursor: string; node: Project }[];
          pageInfo: PageInfo;
        };
      } | null;
    };
  }>(
    token,
    PROJECTS,
    {
      accountId,
      first: options.first ?? 30,
      after: options.after ?? null,
      search: options.search || null,
      sort: options.sort ?? "NAME",
    },
    { signal },
  );
  const connection = result.account.byId?.appsPaginated;
  if (!connection) return { projects: [], pageInfo: { hasNextPage: false } };
  return {
    projects: connection.edges.map((edge) => edge.node),
    pageInfo: connection.pageInfo,
  };
}

export async function getProject(
  token: string,
  appId: string,
  signal?: AbortSignal,
): Promise<Project> {
  const result = await graphqlRequest<{ app: { byId: Project | null } }>(
    token,
    PROJECT_BY_ID,
    { appId },
    { signal },
  );
  if (!result.app.byId) throw notFound("This project");
  return result.app.byId;
}

export async function getBuilds(
  token: string,
  appId: string,
  offset = 0,
  filter?: BuildFilter,
  signal?: AbortSignal,
  limit = BUILD_PAGE_SIZE,
): Promise<Build[]> {
  const result = await graphqlRequest<{
    app: { byId: { builds: Build[] } | null };
  }>(
    token,
    BUILDS,
    { appId, offset, limit, filter: filter ?? null },
    { signal },
  );
  return result.app.byId?.builds ?? [];
}

export async function getBuild(
  token: string,
  buildId: string,
  signal?: AbortSignal,
): Promise<BuildWithSubmissions> {
  const result = await graphqlRequest<{
    builds: { byId: BuildWithSubmissions | null };
  }>(token, BUILD_BY_ID, { buildId }, { signal });
  if (!result.builds.byId) throw notFound("This build");
  return result.builds.byId;
}

export async function cancelBuild(
  token: string,
  buildId: string,
): Promise<{ id: string; status: Build["status"] }> {
  const result = await graphqlRequest<{
    build: { cancelBuild: { id: string; status: Build["status"] } };
  }>(token, CANCEL_BUILD, { buildId }, { attempts: 1 });
  return result.build.cancelBuild;
}
