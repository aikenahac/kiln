// Realtime log streaming over Expo's Centrifugo server.
//
// Mirrors expo/eas-cli (MIT) packages/eas-cli/src/utils/centrifuge.ts and
// api.ts getEASLogsWebsocketUrl, checked 2026-11-03. The connection and
// subscription tokens come from GraphQL mutations; the personal access token
// is only ever sent to api.expo.dev by the transport. One connection serves
// the whole session, and each build or job run gets one ref-counted
// subscription, so the build screen and its logs screen share a stream.
import { Centrifuge, type Subscription } from "centrifuge";

import {
  REALTIME_CONNECTION_TOKEN,
  REALTIME_SUBSCRIPTION_TOKEN,
} from "@/api/documents/core";
import { LogsState } from "@/api/log-state";
import { getSessionEpoch, graphqlRequest } from "@/api/transport";

const WEBSOCKET_URL = "wss://logs.expo.dev/connection/websocket";
const TIMEOUT_MS = 5_000;

export type RealtimeTarget = { type: "BUILD" | "JOB_RUN"; id: string };
export type RealtimeStatus = "connecting" | "live" | "unavailable";

export type RealtimeListener = (event: {
  /** Visible lines changed. */
  changed: boolean;
  /** Streamed lines are waiting for a file fetch to overlap them. */
  waitingForCatchUp: boolean;
  status: RealtimeStatus;
}) => void;

type Entry = {
  state: LogsState;
  listeners: Set<RealtimeListener>;
  subscription: Subscription | null;
  status: RealtimeStatus;
  closed: boolean;
};

let connection: { client: Centrifuge; token: string; epoch: number } | null =
  null;
const entries = new Map<string, Entry>();

export function realtimeKey(target: RealtimeTarget): string {
  return `${target.type}:${target.id}`;
}

function emit(entry: Entry, changed: boolean): void {
  const event = {
    changed,
    waitingForCatchUp: entry.state.waitingForCatchUp,
    status: entry.status,
  };
  for (const listener of entry.listeners) listener(event);
}

function getClient(token: string): Centrifuge {
  const epoch = getSessionEpoch();
  if (connection && connection.token === token && connection.epoch === epoch)
    return connection.client;
  if (connection) {
    // A new session: drop the old socket, keep the entries being started.
    connection.client.removeAllListeners();
    connection.client.disconnect();
    connection = null;
  }
  const client = new Centrifuge(WEBSOCKET_URL, {
    timeout: TIMEOUT_MS,
    getToken: async () => {
      const result = await graphqlRequest<{
        realtimeLogs: { generateCentrifugoConnectionToken: { token: string } };
      }>(token, REALTIME_CONNECTION_TOKEN, {}, { attempts: 1 });
      return result.realtimeLogs.generateCentrifugoConnectionToken.token;
    },
  });
  client.connect();
  connection = { client, token, epoch };
  return client;
}

async function startSubscription(
  token: string,
  target: RealtimeTarget,
  entry: Entry,
): Promise<void> {
  const subscriptionToken = async () => {
    const result = await graphqlRequest<{
      realtimeLogs: {
        generateCentrifugoSubscriptionToken: { channel: string; token: string };
      };
    }>(token, REALTIME_SUBSCRIPTION_TOKEN, { target }, { attempts: 1 });
    return result.realtimeLogs.generateCentrifugoSubscriptionToken;
  };
  try {
    const client = getClient(token);
    const { channel, token: initial } = await subscriptionToken();
    if (entry.closed) return;
    const existing = client.getSubscription(channel);
    if (existing) client.removeSubscription(existing);
    const subscription = client.newSubscription(channel, {
      token: initial,
      getToken: async () => (await subscriptionToken()).token,
    });
    subscription.on("subscribed", () => {
      entry.status = "live";
      emit(entry, false);
    });
    subscription.on("subscribing", () => {
      entry.status = "connecting";
      emit(entry, false);
    });
    subscription.on("error", () => {
      entry.status = "unavailable";
      emit(entry, false);
    });
    subscription.on("publication", ({ data }) => {
      emit(entry, entry.state.ingestRealtime(data));
    });
    entry.subscription = subscription;
    subscription.subscribe();
  } catch {
    // A token without realtime access, or no connection: file polling continues.
    entry.status = "unavailable";
    emit(entry, false);
  }
}

function closeEntry(key: string, entry: Entry): void {
  entry.closed = true;
  const subscription = entry.subscription;
  entry.subscription = null;
  entries.delete(key);
  if (!subscription) return;
  try {
    subscription.unsubscribe();
    subscription.removeAllListeners();
    connection?.client.removeSubscription(subscription);
  } catch {
    // Already gone; nothing to clean up.
  }
}

/** Log state shared by every screen watching this target. */
export function realtimeState(target: RealtimeTarget): LogsState | undefined {
  return entries.get(realtimeKey(target))?.state;
}

export function subscribeRealtimeLogs(
  token: string,
  target: RealtimeTarget,
  listener: RealtimeListener,
): () => void {
  const key = realtimeKey(target);
  let entry = entries.get(key);
  if (!entry) {
    entry = {
      state: new LogsState(),
      listeners: new Set(),
      subscription: null,
      status: "connecting",
      closed: false,
    };
    entries.set(key, entry);
    void startSubscription(token, target, entry);
  }
  entry.listeners.add(listener);
  const current = entry;
  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0) closeEntry(key, current);
    if (entries.size === 0 && connection) {
      connection.client.disconnect();
      connection = null;
    }
  };
}

/** Called on sign-out and token replacement. */
export function closeRealtimeLogs(): void {
  for (const [key, entry] of [...entries]) closeEntry(key, entry);
  if (connection) {
    connection.client.removeAllListeners();
    connection.client.disconnect();
    connection = null;
  }
}
