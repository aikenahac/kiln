import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { PropsWithChildren } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";

import { errorCopy } from "@/api/errors";
import { useAuth } from "@/providers/auth-provider";

const StyledGlassView = withUniwind(GlassView);

export function AccountPill() {
  const { account } = useAuth();
  if (!account) return null;
  const content = (
    <Pressable
      onPress={() => router.push("/accounts")}
      className="h-11 flex-row items-center gap-2 rounded-full px-1.5 pr-4 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`Switch account. Current account ${account.name}`}
    >
      <View className="h-8 w-8 items-center justify-center rounded-[10px] border border-rule bg-raised">
        <Text className="text-[13px] font-bold text-ink">
          {account.name.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <Text className="text-[15px] font-semibold text-ink">{account.name}</Text>
      <Text className="text-ink-3">⌄</Text>
    </Pressable>
  );
  if (Platform.OS === "ios" && isGlassEffectAPIAvailable()) {
    return (
      <StyledGlassView
        isInteractive
        glassEffectStyle="regular"
        className="mb-5 h-11 self-start overflow-hidden rounded-full"
      >
        {content}
      </StyledGlassView>
    );
  }
  return (
    <View className="mb-5 h-11 self-start rounded-full bg-raised-2">
      {content}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="px-5 pb-2 pt-8 text-[22px] font-bold leading-7 text-ink android:px-4 android:text-base android:font-semibold android:text-ink-2">
      {children}
    </Text>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-ground px-8">
      <View className="h-3 w-3 rounded-[3px] bg-live" />
      <Text className="text-base text-ink-2">{label}</Text>
    </View>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <View className="items-start gap-4 px-5 py-8">
      <View className="h-3 w-3 rounded-[3px] bg-alarm" />
      <Text className="text-base leading-6 text-ink" selectable>
        {errorCopy(error)}
      </Text>
      {retry ? (
        <Pressable
          onPress={retry}
          className="min-h-11 justify-center rounded-full bg-ink px-5"
        >
          <Text className="font-semibold text-ground">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center gap-3 px-8 py-16">
      <View className="flex-row gap-1">
        {Array.from({ length: 6 }, (_, index) => (
          <View
            key={index}
            className="h-8 w-10 rounded-lamp border border-lamp-off"
          />
        ))}
      </View>
      <Text className="mt-4 text-center text-[22px] font-bold text-ink">
        {title}
      </Text>
      <Text className="text-center text-[15px] leading-5 text-ink-2">
        {body}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "secondary",
  disabled = false,
  pending = false,
  pendingLabel,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "destructive";
  disabled?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  accessibilityHint?: string;
}) {
  const surface =
    variant === "primary"
      ? "bg-ink"
      : variant === "destructive"
        ? "bg-alarm/10"
        : "bg-raised-2";
  const ink =
    variant === "primary"
      ? "text-ground"
      : variant === "destructive"
        ? "text-alarm-ink"
        : "text-ink";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || pending}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      accessibilityHint={accessibilityHint}
      className={`min-h-[50px] items-center justify-center rounded-full px-5 active:opacity-70 ${surface} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`text-[17px] font-semibold ${ink}`}>
        {pending ? (pendingLabel ?? label) : label}
      </Text>
    </Pressable>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5 android:px-4"
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`h-9 items-center justify-center rounded-full px-4 ${selected ? "bg-ink" : "bg-raised-2"}`}
          >
            <Text
              className={`text-[15px] font-semibold ${selected ? "text-ground" : "text-ink"}`}
            >
              {labels?.[option] ?? option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function FactGroup({ children }: PropsWithChildren) {
  return (
    <View className="mx-4 overflow-hidden rounded-[26px] bg-raised android:rounded-2xl">
      {children}
    </View>
  );
}

export function Fact({
  label,
  value,
  mono = false,
  onPress,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="gap-1 border-b border-rule px-4 py-3 last:border-b-0 active:bg-raised-2"
    >
      <Text className="text-[13px] text-ink-2">{label}</Text>
      <Text
        className={`${mono ? "font-mono text-[14px]" : "text-[17px]"} ${onPress ? "text-ink underline" : "text-ink"}`}
        selectable={!onPress}
      >
        {value}
      </Text>
    </Pressable>
  );
}

export function Note({ children }: { children: string }) {
  return (
    <Text className="px-5 pt-3 text-[13px] leading-[18px] text-ink-3 android:px-4">
      {children}
    </Text>
  );
}

export function ScreenTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="gap-1 px-5 pb-3 pt-4 android:px-4">
      {eyebrow ? (
        <Text className="text-[13px] font-semibold text-ink-2">{eyebrow}</Text>
      ) : null}
      <Text className="text-[34px] font-bold leading-[40px] text-ink android:text-[28px] android:leading-9">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-[15px] leading-5 text-ink-2">{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function OpenInExpo({ url, label = "Open in Expo" }: { url: string; label?: string }) {
  return (
    <View className="px-5 pt-6 android:px-4">
      <Button label={label} onPress={() => void WebBrowser.openBrowserAsync(url)} />
    </View>
  );
}

export function ListFooter({
  loading,
  hasMore,
}: {
  loading: boolean;
  hasMore: boolean;
}) {
  if (loading)
    return <Text className="px-5 py-6 text-center text-[13px] text-ink-3">Loading more</Text>;
  if (!hasMore) return null;
  return <View className="h-6" />;
}
