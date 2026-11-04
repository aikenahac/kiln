import { memo } from "react";
import { Text, View } from "react-native";

export type LampPhase = {
  name: string;
  duration?: string;
  state: "off" | "done" | "live" | "failed" | "flash";
};

const lampClass = {
  off: "border border-lamp-off bg-transparent",
  done: "bg-lamp-done",
  live: "bg-live",
  failed: "bg-alarm",
  flash: "bg-ink",
} as const;

export const PhaseLamps = memo(function PhaseLamps({
  phases,
  size = "row",
}: {
  phases: LampPhase[];
  size?: "hero" | "row" | "mini";
}) {
  if (size === "mini") {
    return (
      <View
        className="mt-2 flex-row gap-0.5"
        accessibilityLabel={phases
          .map((phase) => `${phase.name}, ${phase.state}`)
          .join(". ")}
      >
        {phases.map((phase, index) => (
          <View
            key={`${phase.name}-${index}`}
            className={`h-1.5 flex-1 rounded-sm ${lampClass[phase.state]}`}
          />
        ))}
      </View>
    );
  }
  return (
    <View className="flex-row gap-1">
      {phases.map((phase, index) => (
        <View
          key={`${phase.name}-${index}`}
          className="min-w-0 flex-1"
          accessible
          accessibilityLabel={`${phase.name}, ${phase.state}${phase.duration ? `, ${phase.duration}` : ""}`}
        >
          <View
            className={`${size === "hero" ? "h-9" : "h-7"} rounded-lamp ${lampClass[phase.state]}`}
          />
          <Text
            className={`mt-2 text-[11px] font-semibold ${phase.state === "live" ? "text-live-ink" : phase.state === "failed" ? "text-alarm-ink" : "text-ink-2"}`}
            numberOfLines={1}
          >
            {phase.name}
          </Text>
          {phase.duration ? (
            <Text className="font-mono text-[11px] text-ink-2" selectable>
              {phase.duration}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
});
