import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, type PropsWithChildren } from "react";
import { AppState, type AppStateStatus } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: false, refetchOnReconnect: true },
    mutations: { retry: false },
  },
});

function onAppStateChange(status: AppStateStatus): void {
  focusManager.setFocused(status === "active");
}

export function QueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const appState = AppState.addEventListener("change", onAppStateChange);
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) =>
        setOnline(Boolean(state.isConnected)),
      ),
    );
    return () => {
      appState.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
