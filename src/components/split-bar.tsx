import { Text, View } from "react-native";

import type { Segment } from "@/lib/branch-mapping";

/**
 * Channel → branch split. The first segment is the branch being rolled out
 * (amber only while it is partial), the rest are quiet grey. `deltaFrom`
 * draws the change against a previous split as a striped segment.
 */
export function SplitBar({
  segments,
  deltaFrom,
  size = "row",
}: {
  segments: Segment[];
  deltaFrom?: number;
  size?: "row" | "hero";
}) {
  if (!segments.length) {
    return (
      <View className="h-3 rounded-full border border-lamp-off" accessibilityLabel="No branch mapped" />
    );
  }
  const [first, ...rest] = segments;
  const partial = first!.percent > 0 && first!.percent < 100;
  const before = deltaFrom ?? first!.percent;
  const low = Math.min(before, first!.percent);
  const change = Math.abs(first!.percent - before);
  const height = size === "hero" ? "h-6" : "h-3";
  return (
    <View
      accessible
      accessibilityLabel={segments.map((segment) => `${segment.name} ${segment.percent} percent`).join(", ")}
      className="gap-2"
    >
      <View className={`${height} flex-row gap-0.5 overflow-hidden rounded-md`}>
        {low > 0 ? (
          <View style={{ flex: low }} className={partial ? "bg-live" : "bg-lamp-done"} />
        ) : null}
        {change > 0 ? (
          <View
            style={{ flex: change }}
            className={`overflow-hidden ${first!.percent > before ? "bg-live/40" : "bg-lamp-done/50"} border border-dashed border-live`}
          />
        ) : null}
        {100 - low - change > 0 ? (
          <View style={{ flex: 100 - low - change }} className="bg-lamp-done" />
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {[first!, ...rest].map((segment, index) => (
          <Text key={`${segment.branchId}-${index}`} className="text-[13px] text-ink-2">
            <Text
              className="font-semibold text-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {segment.percent}%
            </Text>{" "}
            {segment.name}
          </Text>
        ))}
      </View>
    </View>
  );
}
