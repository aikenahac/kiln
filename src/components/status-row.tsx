import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { PhaseLamps, type LampPhase } from "@/components/phase-lamps";
import type { RowStatus } from "@/lib/format";

const markClass: Record<RowStatus, string> = {
  failed: "bg-alarm",
  live: "bg-live",
  queued: "border border-live bg-transparent",
  canceled: "border border-ink-3 bg-transparent",
  done: "bg-lamp-done",
};

const markWord: Record<RowStatus, string> = {
  failed: "failed",
  live: "running",
  queued: "queued",
  canceled: "canceled",
  done: "finished",
};

export const StatusRow = memo(function StatusRow({
  title,
  subtitle,
  meta,
  status,
  phases,
  error,
  onPress,
  leading,
  trailing,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Omit for rows that are not jobs (branches, variables, members). */
  status?: RowStatus;
  phases?: LampPhase[];
  error?: string;
  onPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[title, status ? markWord[status] : undefined, subtitle, meta, error]
        .filter(Boolean)
        .join(", ")}
      className="min-h-[68px] flex-row gap-3 px-5 py-3 active:bg-raised-2 android:min-h-[72px] android:px-4"
    >
      {leading ? (
        <View className="relative">
          {leading}
          {status ? (
            <View
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-[3px] border-2 border-ground ${markClass[status]}`}
            />
          ) : null}
        </View>
      ) : status ? (
        <View className={`mt-1.5 h-3 w-3 rounded-[3px] ${markClass[status]}`} />
      ) : null}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-start gap-2">
          <Text
            className="flex-1 text-[17px] font-semibold leading-[22px] text-ink android:text-base android:font-medium"
            numberOfLines={2}
          >
            {title}
          </Text>
          {meta ? (
            <Text
              className="text-[13px] text-ink-3"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {meta}
            </Text>
          ) : null}
          {trailing}
        </View>
        {subtitle ? (
          <Text
            className="mt-0.5 text-[13px] leading-[18px] text-ink-2 android:text-sm android:leading-5"
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
        {error ? (
          <Text
            className="mt-1.5 font-mono text-[13px] leading-[18px] text-alarm-ink"
            numberOfLines={2}
            selectable
          >
            {error}
          </Text>
        ) : null}
        {phases ? <PhaseLamps phases={phases} size="mini" /> : null}
      </View>
    </Pressable>
  );
});
