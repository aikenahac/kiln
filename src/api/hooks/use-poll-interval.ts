import { useIsFocused } from "expo-router";

import { useRefreshInterval } from "@/lib/preferences";

/**
 * Poll interval for a screen that shows active work. TanStack pauses
 * intervals while the app is backgrounded (focusManager) or offline
 * (onlineManager); this adds the per-screen focus check and the user's
 * refresh preference.
 */
export function usePollInterval(active: boolean): number | false {
  const focused = useIsFocused();
  const [seconds] = useRefreshInterval();
  return active && focused && seconds > 0 ? seconds * 1000 : false;
}
