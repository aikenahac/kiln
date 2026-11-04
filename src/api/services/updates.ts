import {
  BRANCHES,
  CHANNELS,
  CREATE_BRANCH,
  CREATE_CHANNEL,
  DELETE_BRANCH,
  DELETE_CHANNEL,
  EDIT_CHANNEL_MAPPING,
  PAUSE_CHANNEL,
  RENAME_BRANCH,
  RESUME_CHANNEL,
  UPDATE_GROUP,
  UPDATE_GROUPS,
} from "@/api/documents/resources";
import { graphqlRequest } from "@/api/transport";
import type { Branch, BranchSummary, Channel, Platform, Update } from "@/types/api";

export const UPDATE_PAGE_SIZE = 25;

type RawBranch = Omit<BranchSummary, "latestUpdate"> & {
  updateGroups: Update[][];
  createdAt?: string;
  updatedAt?: string;
};

function branchSummary(raw: RawBranch): BranchSummary {
  const latest = raw.updateGroups[0]?.[0];
  return {
    id: raw.id,
    name: raw.name,
    latestUpdate: latest
      ? {
          id: latest.id,
          group: latest.group,
          message: latest.message,
          createdAt: latest.createdAt,
          runtimeVersion: latest.runtimeVersion,
        }
      : null,
  };
}

export type UpdateGroup = {
  group: string;
  updates: Update[];
};

export async function getUpdateGroups(
  token: string,
  appId: string,
  offset = 0,
  filter: { platform?: Platform; runtimeVersions?: string[] } = {},
  signal?: AbortSignal,
  limit = UPDATE_PAGE_SIZE,
): Promise<UpdateGroup[]> {
  const result = await graphqlRequest<{
    app: { byId: { updateGroups: Update[][] } | null };
  }>(
    token,
    UPDATE_GROUPS,
    { appId, offset, limit, filter },
    { signal },
  );
  return (result.app.byId?.updateGroups ?? [])
    .filter((updates) => updates.length > 0)
    .map((updates) => ({ group: updates[0]!.group, updates }));
}

export async function getUpdateGroup(
  token: string,
  groupId: string,
  signal?: AbortSignal,
): Promise<Update[]> {
  const result = await graphqlRequest<{ updatesByGroup: Update[] }>(
    token,
    UPDATE_GROUP,
    { groupId },
    { signal },
  );
  return result.updatesByGroup;
}

export async function getChannels(
  token: string,
  appId: string,
  signal?: AbortSignal,
): Promise<Channel[]> {
  const result = await graphqlRequest<{
    app: {
      byId: {
        updateChannels: (Omit<Channel, "updateBranches"> & {
          updateBranches: RawBranch[];
        })[];
      } | null;
    };
  }>(token, CHANNELS, { appId, offset: 0, limit: 50 }, { signal });
  return (result.app.byId?.updateChannels ?? []).map((channel) => ({
    ...channel,
    updateBranches: channel.updateBranches.map(branchSummary),
  }));
}

export async function getBranches(
  token: string,
  appId: string,
  signal?: AbortSignal,
): Promise<Branch[]> {
  const result = await graphqlRequest<{
    app: { byId: { updateBranches: RawBranch[] } | null };
  }>(token, BRANCHES, { appId, offset: 0, limit: 50 }, { signal });
  return (result.app.byId?.updateBranches ?? []).map((raw) => ({
    ...branchSummary(raw),
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  }));
}

export async function editChannelMapping(
  token: string,
  channelId: string,
  branchMapping: string,
): Promise<void> {
  await graphqlRequest(
    token,
    EDIT_CHANNEL_MAPPING,
    { channelId, branchMapping },
    { attempts: 1 },
  );
}

export async function createChannel(
  token: string,
  appId: string,
  name: string,
  branchMapping: string,
): Promise<void> {
  await graphqlRequest(
    token,
    CREATE_CHANNEL,
    { appId, name, branchMapping },
    { attempts: 1 },
  );
}

export async function deleteChannel(
  token: string,
  channelId: string,
): Promise<void> {
  await graphqlRequest(token, DELETE_CHANNEL, { channelId }, { attempts: 1 });
}

export async function setChannelPaused(
  token: string,
  channelId: string,
  paused: boolean,
): Promise<void> {
  await graphqlRequest(
    token,
    paused ? PAUSE_CHANNEL : RESUME_CHANNEL,
    { channelId },
    { attempts: 1 },
  );
}

export async function createBranch(
  token: string,
  appId: string,
  name: string,
): Promise<void> {
  await graphqlRequest(token, CREATE_BRANCH, { appId, name }, { attempts: 1 });
}

export async function renameBranch(
  token: string,
  branchId: string,
  newName: string,
): Promise<void> {
  await graphqlRequest(
    token,
    RENAME_BRANCH,
    { input: { id: branchId, newName } },
    { attempts: 1 },
  );
}

export async function deleteBranch(
  token: string,
  branchId: string,
): Promise<void> {
  await graphqlRequest(token, DELETE_BRANCH, { branchId }, { attempts: 1 });
}
