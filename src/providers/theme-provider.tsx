import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme, View } from "react-native";
import { Uniwind } from "uniwind";

import {
  preferenceKeys,
  preferences,
  type AppearancePreference,
} from "@/lib/preferences";

type ThemeValue = {
  appearance: AppearancePreference;
  isDark: boolean;
  setAppearance: (value: AppearancePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export const palette = {
  dark: {
    ground: "#0A0B0D",
    raised: "#15171B",
    ink: "#F2F1EC",
    ink2: "#A9ABB0",
    ink3: "#8A8D94",
    live: "#FFB238",
    liveInk: "#FFC566",
    alarm: "#FF6152",
    alarmInk: "#FF9A8F",
  },
  light: {
    ground: "#F3F3F0",
    raised: "#FFFFFF",
    ink: "#111214",
    ink2: "#53565C",
    ink3: "#666A71",
    live: "#F5A524",
    liveInk: "#875A00",
    alarm: "#D23A2A",
    alarmInk: "#B92A1C",
  },
} as const;

export function KilnThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const saved = preferences.getString(preferenceKeys.appearance);
  const [appearance, setAppearanceState] = useState<AppearancePreference>(
    saved === "light" || saved === "system" ? saved : "dark",
  );
  const isDark =
    appearance === "dark" || (appearance === "system" && system !== "light");
  useEffect(() => {
    Uniwind.setTheme(appearance);
  }, [appearance]);
  const value = useMemo<ThemeValue>(
    () => ({
      appearance,
      isDark,
      setAppearance(next) {
        preferences.set(preferenceKeys.appearance, next);
        setAppearanceState(next);
      },
    }),
    [appearance, isDark],
  );

  return (
    <ThemeContext value={value}>
      <View className="flex-1 bg-ground">
        <NavigationThemeProvider
          value={
            isDark
              ? {
                  ...DarkTheme,
                  colors: {
                    ...DarkTheme.colors,
                    background: palette.dark.ground,
                    card: palette.dark.ground,
                    text: palette.dark.ink,
                    primary: palette.dark.ink,
                    border: palette.dark.raised,
                  },
                }
              : {
                  ...DefaultTheme,
                  colors: {
                    ...DefaultTheme.colors,
                    background: palette.light.ground,
                    card: palette.light.ground,
                    text: palette.light.ink,
                    primary: palette.light.ink,
                    border: palette.light.raised,
                  },
                }
          }
        >
          {children}
        </NavigationThemeProvider>
      </View>
    </ThemeContext>
  );
}

export type PaletteColor = keyof (typeof palette)["dark"];

export function usePalette(): (typeof palette)["dark"] | (typeof palette)["light"] {
  const { isDark } = useKilnTheme();
  return isDark ? palette.dark : palette.light;
}

export function useKilnTheme(): ThemeValue {
  const value = use(ThemeContext);
  if (!value)
    throw new Error("useKilnTheme must be used inside KilnThemeProvider");
  return value;
}
