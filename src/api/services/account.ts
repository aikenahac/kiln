import {
  ACCOUNT_MEMBERS,
  APPLE_DEVICES,
  CREATE_DEVICE_REGISTRATION,
  DELETE_APPLE_DEVICE,
  ENVIRONMENT_VARIABLES,
  RENAME_APPLE_DEVICE,
  WORKER_DEPLOYMENTS,
} from "@/api/documents/resources";
import { graphqlRequest } from "@/api/transport";
import type {
  AccountMember,
  AppleDevice,
  AppleDeviceClass,
  EnvironmentVariable,
  Page,
  PageInfo,
  WorkerAlias,
  WorkerDeployment,
} from "@/types/api";

type Connection<T> = { edges: { node: T }[]; pageInfo: PageInfo };

function page<T>(connection: Connection<T> | undefined): Page<T> {
  return {
    items: connection?.edges.map((edge) => edge.node) ?? [],
    pageInfo: connection?.pageInfo ?? { hasNextPage: false },
  };
}

export type AppleTeam = {
  id: string;
  appleTeamIdentifier: string;
  appleTeamName?: string | null;
};

export async function getAppleDevices(
  token: string,
  accountId: string,
  options: { after?: string; deviceClass?: AppleDeviceClass } = {},
  signal?: AbortSignal,
): Promise<Page<AppleDevice> & { teams: AppleTeam[] }> {
  const result = await graphqlRequest<{
    account: {
      byId: {
        appleTeams: AppleTeam[];
        appleDevicesPaginated: Connection<AppleDevice>;
      } | null;
    };
  }>(
    token,
    APPLE_DEVICES,
    {
      accountId,
      first: 50,
      after: options.after ?? null,
      filter: options.deviceClass ? { class: options.deviceClass } : null,
    },
    { signal },
  );
  return {
    ...page(result.account.byId?.appleDevicesPaginated),
    teams: result.account.byId?.appleTeams ?? [],
  };
}

export async function renameAppleDevice(
  token: string,
  id: string,
  name: string,
): Promise<void> {
  await graphqlRequest(
    token,
    RENAME_APPLE_DEVICE,
    { id, appleDeviceUpdateInput: { name } },
    { attempts: 1 },
  );
}

export async function deleteAppleDevice(
  token: string,
  deviceId: string,
): Promise<void> {
  await graphqlRequest(
    token,
    DELETE_APPLE_DEVICE,
    { deviceId },
    { attempts: 1 },
  );
}

/** Same URL eas-cli prints: devices/actions/create/registrationUrlMethod.ts. */
export function deviceRegistrationUrl(requestId: string): string {
  return `https://expo.dev/register-device/${encodeURIComponent(requestId)}`;
}

export async function createDeviceRegistration(
  token: string,
  accountId: string,
  appleTeamId: string,
): Promise<string> {
  const result = await graphqlRequest<{
    appleDeviceRegistrationRequest: {
      createAppleDeviceRegistrationRequest: { id: string };
    };
  }>(
    token,
    CREATE_DEVICE_REGISTRATION,
    { accountId, appleTeamId },
    { attempts: 1 },
  );
  return deviceRegistrationUrl(
    result.appleDeviceRegistrationRequest.createAppleDeviceRegistrationRequest
      .id,
  );
}

export async function getEnvironmentVariables(
  token: string,
  appId: string,
  environment: string | undefined,
  signal?: AbortSignal,
): Promise<{ environments: string[]; variables: EnvironmentVariable[] }> {
  const result = await graphqlRequest<{
    app: {
      byId: {
        environmentVariableEnvironments: string[];
        environmentVariables: EnvironmentVariable[];
      } | null;
    };
  }>(
    token,
    ENVIRONMENT_VARIABLES,
    { appId, environment: environment ?? null },
    { signal },
  );
  return {
    environments: result.app.byId?.environmentVariableEnvironments ?? [],
    variables: result.app.byId?.environmentVariables ?? [],
  };
}

export async function getWorkerDeployments(
  token: string,
  appId: string,
  after: string | undefined,
  signal?: AbortSignal,
): Promise<Page<WorkerDeployment> & { aliases: WorkerAlias[] }> {
  const result = await graphqlRequest<{
    app: {
      byId: {
        workerDeploymentAliases: Connection<WorkerAlias>;
        workerDeployments: Connection<WorkerDeployment>;
      } | null;
    };
  }>(
    token,
    WORKER_DEPLOYMENTS,
    { appId, first: 25, after: after ?? null },
    { signal },
  );
  return {
    ...page(result.app.byId?.workerDeployments),
    aliases: page(result.app.byId?.workerDeploymentAliases).items,
  };
}

export async function getAccountMembers(
  token: string,
  accountId: string,
  after: string | undefined,
  signal?: AbortSignal,
): Promise<Page<AccountMember>> {
  const result = await graphqlRequest<{
    account: { byId: { membersPaginated: Connection<AccountMember> } | null };
  }>(
    token,
    ACCOUNT_MEMBERS,
    { accountId, first: 50, after: after ?? null },
    { signal },
  );
  return page(result.account.byId?.membersPaginated);
}
