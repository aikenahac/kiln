import { useCallback, useMemo } from "react";
import { createMMKV, useMMKVNumber, useMMKVString } from "react-native-mmkv";

export type AppearancePreference = "system" | "dark" | "light";

export const preferences = createMMKV({ id: "kiln.preferences" });

export const preferenceKeys = {
  appearance: "appearance",
  refreshInterval: "refreshInterval",
  selectedAccountId: "selectedAccountId",
  favorites: "favorites",
  recents: "recents",
} as const;

/** Seconds between foreground refreshes of active work. 0 means manual only. */
export const refreshIntervals = [10, 15, 30, 60, 0] as const;
export type RefreshInterval = (typeof refreshIntervals)[number];
export const DEFAULT_REFRESH_INTERVAL: RefreshInterval = 15;

export function parseStringList(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function getStringList(key: string): string[] {
  return parseStringList(preferences.getString(key));
}

export function setStringList(key: string, value: string[]): void {
  preferences.set(key, JSON.stringify(value));
}

export function useStringList(
  key: string,
): [string[], (next: string[]) => void] {
  const [raw, setRaw] = useMMKVString(key, preferences);
  const list = useMemo(() => parseStringList(raw), [raw]);
  const set = useCallback(
    (next: string[]) => setRaw(JSON.stringify(next)),
    [setRaw],
  );
  return [list, set];
}

export function useFavorites() {
  const [favorites, setFavorites] = useStringList(preferenceKeys.favorites);
  const toggle = useCallback(
    (id: string) =>
      setFavorites(
        favorites.includes(id)
          ? favorites.filter((value) => value !== id)
          : [id, ...favorites],
      ),
    [favorites, setFavorites],
  );
  return { favorites, setFavorites, toggle };
}

export function recordRecent(id: string): void {
  setStringList(
    preferenceKeys.recents,
    [
      id,
      ...getStringList(preferenceKeys.recents).filter((value) => value !== id),
    ].slice(0, 12),
  );
}

export function useRefreshInterval(): [
  RefreshInterval,
  (value: RefreshInterval) => void,
] {
  const [stored, setStored] = useMMKVNumber(
    preferenceKeys.refreshInterval,
    preferences,
  );
  const value =
    refreshIntervals.find((interval) => interval === stored) ??
    DEFAULT_REFRESH_INTERVAL;
  return [value, setStored];
}
