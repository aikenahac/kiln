import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { usePollInterval } from "@/api/hooks/use-poll-interval";
import { queryKeys } from "@/api/keys";
import { LogsState } from "@/api/log-state";
import {
  ExpiredLogError,
  groupLogLinesIntoSteps,
  loadLogFiles,
  type LogStep,
} from "@/api/logs";
import {
  realtimeState,
  subscribeRealtimeLogs,
  type RealtimeStatus,
  type RealtimeTarget,
} from "@/api/realtime";
import { useAuth } from "@/providers/auth-provider";

export type LogSource = {
  kind: "build" | "submission" | "job";
  id: string;
  urls: string[];
  /** The job is still producing output. */
  active: boolean;
  /** Builds and workflow job runs stream; submissions only poll. */
  realtime?: RealtimeTarget;
  /** Re-query the parent for fresh signed URLs after one expires. */
  refreshUrls: () => Promise<string[]>;
};

export type LiveState = "off" | RealtimeStatus;

/** While a stream is live, the file is re-read only to fill gaps. */
const LIVE_FILE_INTERVAL_MS = 60_000;
/** Streamed lines wait for a file fetch that overlaps them. */
const CATCH_UP_DELAY_MS = 2_500;
/** Coalesce bursts of publications into one re-render. */
const RENDER_THROTTLE_MS = 300;

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) =>
      setActive(status === "active"),
    );
    return () => subscription.remove();
  }, []);
  return active;
}

export function useLogs(source: LogSource | undefined) {
  const { token, account } = useAuth();
  const client = useQueryClient();
  const latest = useRef(source);
  useEffect(() => {
    latest.current = source;
  }, [source]);
  const focused = useIsFocused();
  const appActive = useAppActive();
  const interval = usePollInterval(Boolean(source?.active));
  const [live, setLive] = useState<LiveState>("off");
  const key = queryKeys.logs(
    account?.id ?? "none",
    source?.kind ?? "none",
    source?.id ?? "none",
  );

  const query = useQuery<LogStep[]>({
    queryKey: key,
    enabled: Boolean(account && source && source.urls.length),
    // Signed URLs and log text are never persisted; keep them only while used.
    gcTime: 60_000,
    queryFn: async ({ signal }) => {
      const current = latest.current!;
      let lines;
      try {
        lines = await loadLogFiles(current.urls, signal);
      } catch (error) {
        if (!(error instanceof ExpiredLogError)) throw error;
        lines = await loadLogFiles(await current.refreshUrls(), signal);
      }
      const state =
        (current.realtime && realtimeState(current.realtime)) ?? new LogsState();
      state.ingestFile(lines);
      if (!current.active) state.markCompleted();
      return groupLogLinesIntoSteps(state.lines(), current.active);
    },
    refetchInterval: source?.active
      ? live === "live" && interval
        ? Math.max(interval, LIVE_FILE_INTERVAL_MS)
        : interval
      : false,
  });

  // The final file is complete once the job stops; read it one more time.
  const wasActive = useRef(source?.active);
  const { refetch } = query;
  useEffect(() => {
    if (wasActive.current && source && !source.active) void refetch();
    wasActive.current = source?.active;
  }, [source, refetch]);

  const target = source?.realtime;
  const streaming = Boolean(
    token && target && source?.active && focused && appActive,
  );
  const targetKey = target ? `${target.type}:${target.id}` : "";
  useEffect(() => {
    if (!streaming || !target || !token) return;
    let renderTimer: ReturnType<typeof setTimeout> | null = null;
    let catchUpTimer: ReturnType<typeof setTimeout> | null = null;
    const render = () => {
      renderTimer = null;
      const state = realtimeState(target);
      if (!state) return;
      client.setQueryData<LogStep[]>(key, groupLogLinesIntoSteps(state.lines(), true));
    };
    const unsubscribe = subscribeRealtimeLogs(token, target, (event) => {
      setLive(event.status);
      if (event.changed && !renderTimer) renderTimer = setTimeout(render, RENDER_THROTTLE_MS);
      if (event.waitingForCatchUp && !catchUpTimer)
        catchUpTimer = setTimeout(() => {
          catchUpTimer = null;
          void client.refetchQueries({ queryKey: key, exact: true });
        }, CATCH_UP_DELAY_MS);
    });
    return () => {
      unsubscribe();
      if (renderTimer) clearTimeout(renderTimer);
      if (catchUpTimer) clearTimeout(catchUpTimer);
      setLive("off");
    };
    // key and target are derived from targetKey and the source id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, targetKey, token, client]);

  return { ...query, live: streaming ? live : ("off" as LiveState) };
}
