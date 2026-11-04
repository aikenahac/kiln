import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { getCurrentActor } from "@/api/services/core";
import { bumpSessionEpoch, getSessionEpoch } from "@/api/transport";
import { preferenceKeys, preferences } from "@/lib/preferences";
import { deleteToken, restoreToken, saveToken } from "@/lib/token-store";
import { closeRealtimeLogs } from "@/api/realtime";
import type { Account, Actor } from "@/types/api";

type AuthValue = {
  state: "loading" | "signedOut" | "signedIn";
  actor: Actor | null;
  account: Account | null;
  token: string | null;
  recoveryMessage: string | null;
  signIn: (
    token: string,
    onProgress?: (step: "accounts" | "save") => void,
  ) => Promise<Actor>;
  signOut: () => Promise<void>;
  selectAccount: (account: Account) => void;
  testConnection: () => Promise<number>;
};

const AuthContext = createContext<AuthValue | null>(null);

function chooseAccount(actor: Actor): Account | null {
  const selected = preferences.getString(preferenceKeys.selectedAccountId);
  return (
    actor.accounts.find((account) => account.id === selected) ??
    actor.accounts[0] ??
    null
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthValue["state"]>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [actor, setActor] = useState<Actor | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    closeRealtimeLogs();
    bumpSessionEpoch();
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      preferences.remove(preferenceKeys.selectedAccountId);
      preferences.remove(preferenceKeys.recents);
      await deleteToken();
    } finally {
      setToken(null);
      setActor(null);
      setAccount(null);
      setState("signedOut");
    }
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const restored = await restoreToken();
        if (!active) return;
        if (restored.recovered)
          setRecoveryMessage(
            "The encrypted token could not be restored on this device. Sign in again.",
          );
        if (!restored.token) {
          setState("signedOut");
          return;
        }
        const current = await getCurrentActor(restored.token);
        if (!active) return;
        setToken(restored.token);
        setActor(current);
        setAccount(chooseAccount(current));
        setState("signedIn");
      } catch {
        if (active) {
          setRecoveryMessage(
            "The saved session could not be restored. Sign in again.",
          );
          await clearSession();
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [clearSession]);

  const signIn = useCallback(
    async (
      nextToken: string,
      onProgress?: (step: "accounts" | "save") => void,
    ) => {
      const normalized = nextToken.trim();
      const current = await getCurrentActor(normalized);
      onProgress?.("accounts");
      await saveToken(normalized);
      onProgress?.("save");
      bumpSessionEpoch();
      setToken(normalized);
      setActor(current);
      setAccount(chooseAccount(current));
      setRecoveryMessage(null);
      setState("signedIn");
      return current;
    },
    [],
  );

  const selectAccount = useCallback(
    (next: Account) => {
      preferences.set(preferenceKeys.selectedAccountId, next.id);
      setAccount(next);
      void queryClient.cancelQueries();
    },
    [queryClient],
  );

  const testConnection = useCallback(async () => {
    if (!token) throw new Error("Sign in first.");
    const start = Date.now();
    await getCurrentActor(token);
    return Date.now() - start;
  }, [token]);

  const value = useMemo<AuthValue>(
    () => ({
      state,
      actor,
      account,
      token,
      recoveryMessage,
      signIn,
      signOut: clearSession,
      selectAccount,
      testConnection,
    }),
    [
      state,
      actor,
      account,
      token,
      recoveryMessage,
      signIn,
      clearSession,
      selectAccount,
      testConnection,
    ],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function useSessionEpoch(): number {
  return getSessionEpoch();
}
