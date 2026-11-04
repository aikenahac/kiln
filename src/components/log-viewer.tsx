import { FlashList, type FlashListRef } from "@shopify/flash-list";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  defaultExpanded,
  findMatches,
  flattenSteps,
  stepText,
  visibleSteps,
  type LogRow,
  type LogStep,
  type StepResult,
} from "@/api/logs";
import { Icon } from "@/components/icon";
import { duration } from "@/lib/format";
import { usePalette } from "@/providers/theme-provider";

const resultMark: Record<StepResult, string> = {
  success: "bg-lamp-done",
  warning: "bg-lamp-done",
  failed: "bg-alarm",
  running: "bg-live",
  skipped: "border border-lamp-off",
  unknown: "border border-ink-3",
};

const resultWord: Record<StepResult, string> = {
  success: "succeeded",
  warning: "succeeded with warnings",
  failed: "failed",
  running: "running",
  skipped: "skipped",
  unknown: "no result",
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const StepHeader = memo(function StepHeader({
  step,
  expanded,
  onToggle,
}: {
  step: LogStep;
  expanded: boolean;
  onToggle: (key: string) => void;
}) {
  const time =
    step.durationSeconds !== undefined
      ? step.durationSeconds < 1
        ? "< 1s"
        : duration(step.durationSeconds)
      : step.result === "running"
        ? "running"
        : "";
  return (
    <View className="min-h-[56px] flex-row items-center border-b border-rule bg-ground">
      <Pressable
        onPress={() => onToggle(step.key)}
        className="min-h-[56px] flex-1 flex-row items-center gap-3 pl-3 pr-1 active:bg-raised-2"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${step.label}, ${resultWord[step.result]}${time ? `, ${time}` : ""}${step.warnings ? `, ${plural(step.warnings, "warning")}` : ""}. ${plural(step.lines.length, "line")}.`}
      >
        <Icon name={expanded ? "chevronDown" : "chevronRight"} size={14} color="ink3" />
        <View className={`h-3 w-3 rounded-[3px] ${resultMark[step.result]}`} />
        <Text
          className={`min-w-0 flex-shrink text-[16px] font-medium ${step.result === "failed" ? "text-alarm-ink" : step.result === "running" ? "text-live-ink" : "text-ink"}`}
          numberOfLines={2}
        >
          {step.label}
        </Text>
        {step.warnings > 0 ? (
          <View className="flex-row items-center gap-1 rounded-full bg-raised-2 px-2 py-0.5">
            <Icon name="warning" size={11} color="ink2" />
            <Text className="text-[12px] font-semibold text-ink-2" style={{ fontVariant: ["tabular-nums"] }}>
              {step.warnings}
            </Text>
          </View>
        ) : null}
        <View className="flex-1" />
        <Text
          className="font-mono text-[13px] text-ink-2"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {time}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void Clipboard.setStringAsync(stepText(step));
          void Haptics.selectionAsync();
        }}
        className="h-12 w-12 items-center justify-center active:opacity-60"
        accessibilityRole="button"
        accessibilityLabel={`Copy ${step.label} log`}
      >
        <Icon name="copy" size={15} color="ink3" />
      </Pressable>
    </View>
  );
});

const LineRow = memo(function LineRow({
  number,
  msg,
  level,
  current,
  matched,
}: {
  number: number;
  msg: string;
  level?: number;
  current: boolean;
  matched: boolean;
}) {
  const error = level !== undefined && level >= 50;
  const warning = level !== undefined && level >= 40 && !error;
  return (
    <View
      className={`flex-row gap-3 px-3 py-px ${current ? "bg-live/25" : matched ? "bg-live/10" : error ? "bg-alarm/10" : ""}`}
    >
      <Text
        className="w-10 text-right font-mono text-[11px] leading-[18px] text-ink-3"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {number}
      </Text>
      <Text
        className={`min-w-0 flex-1 font-mono text-[12px] leading-[18px] ${error ? "text-alarm-ink" : warning ? "text-live-ink" : "text-ink-2"}`}
        selectable
      >
        {msg}
      </Text>
    </View>
  );
});

export function LogViewer({
  steps,
  title,
  refreshing,
  onRefresh,
  header,
  follow = false,
}: {
  steps: LogStep[];
  title: string;
  refreshing: boolean;
  onRefresh: () => void;
  header?: ReactElement;
  /** The job is running: keep the newest line in view until the reader scrolls away. */
  follow?: boolean;
}) {
  const colors = usePalette();
  const shown = useMemo(() => visibleSteps(steps), [steps]);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    defaultExpanded(shown),
  );
  // Steps the reader opened or closed by hand keep that state across polls;
  // newly failed or running steps open on their own.
  const touched = useRef(new Set<string>());
  useEffect(() => {
    setExpanded((previous) => {
      let changed = false;
      const next = new Set(previous);
      for (const key of defaultExpanded(shown)) {
        if (!touched.current.has(key) && !next.has(key)) {
          next.add(key);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [shown]);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const matches = useMemo(
    () => findMatches(shown, deferredSearch),
    [shown, deferredSearch],
  );
  const [matchIndex, setMatchIndex] = useState(0);
  const current = matches.length
    ? matches[Math.min(matchIndex, matches.length - 1)]
    : undefined;
  const matchedIds = useMemo(
    () => new Set(matches.map((match) => match.lineId)),
    [matches],
  );

  const rows = useMemo(() => flattenSteps(shown, expanded), [shown, expanded]);
  const list = useRef<FlashListRef<LogRow>>(null);
  // A jump target waits here until the step holding it is expanded.
  const pendingScroll = useRef<string | null>(null);
  const scrollTo = useCallback((target: LogRow[], rowKey: string) => {
    const index = target.findIndex((row) => row.key === rowKey);
    if (index < 0) return false;
    void list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    return true;
  }, []);
  useEffect(() => {
    if (pendingScroll.current && scrollTo(rows, pendingScroll.current))
      pendingScroll.current = null;
  }, [rows, scrollTo]);

  const [following, setFollowing] = useState(follow);
  const lineCount = rows.length;
  useEffect(() => {
    if (!follow || !following || pendingScroll.current) return;
    void list.current?.scrollToEnd({ animated: true });
  }, [follow, following, lineCount]);

  const toggle = useCallback((key: string) => {
    touched.current.add(key);
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const reveal = (stepKey: string, rowKey: string) => {
    setFollowing(false);
    if (expanded.has(stepKey) || rowKey.startsWith("h:")) {
      if (scrollTo(rows, rowKey)) return;
    }
    pendingScroll.current = rowKey;
    setExpanded((previous) =>
      previous.has(stepKey) ? previous : new Set([...previous, stepKey]),
    );
  };

  const step = (delta: number) => {
    if (!matches.length) return;
    const next = (matchIndex + delta + matches.length) % matches.length;
    setMatchIndex(next);
    const match = matches[next]!;
    reveal(match.stepKey, `l:${match.stepKey}:${match.lineId}`);
    void Haptics.selectionAsync();
  };

  const jumpTo = (target: LogStep) => {
    touched.current.add(target.key);
    reveal(target.key, `h:${target.key}`);
  };

  const allText = useCallback(
    () =>
      shown
        .map((item) => `== ${item.label}\n${stepText(item)}`)
        .join("\n\n"),
    [shown],
  );

  const totalWarnings = shown.reduce((sum, item) => sum + item.warnings, 0);

  return (
    <View className="flex-1">
      <FlashList
        ref={list}
        onScrollBeginDrag={() => {
          if (follow) setFollowing(false);
        }}
        data={rows}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.type}
        extraData={`${current?.lineId ?? ""}:${matches.length}`}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 112 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink2}
          />
        }
        ListHeaderComponent={
          <View className="gap-3 pb-3 pt-2">
            {header}
            <View className="mx-4 h-11 flex-row items-center gap-2 rounded-full bg-raised-2 pl-4 pr-1">
              <Icon name="search" size={15} color="ink3" />
              <TextInput
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  setMatchIndex(0);
                }}
                onSubmitEditing={() => step(1)}
                returnKeyType="search"
                placeholder="Search logs"
                placeholderTextColor={colors.ink2}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-[16px] text-ink"
                accessibilityLabel="Search logs"
              />
              {search ? (
                <>
                  <Text
                    className="font-mono text-[13px] text-ink-2"
                    style={{ fontVariant: ["tabular-nums"] }}
                    accessibilityLiveRegion="polite"
                  >
                    {matches.length
                      ? `${Math.min(matchIndex, matches.length - 1) + 1} of ${matches.length}`
                      : "0"}
                  </Text>
                  <Pressable
                    onPress={() => step(-1)}
                    disabled={!matches.length}
                    className="h-11 w-10 items-center justify-center"
                    accessibilityLabel="Previous match"
                  >
                    <Icon name="up" size={15} color={matches.length ? "ink" : "ink3"} />
                  </Pressable>
                  <Pressable
                    onPress={() => step(1)}
                    disabled={!matches.length}
                    className="h-11 w-10 items-center justify-center"
                    accessibilityLabel="Next match"
                  >
                    <Icon name="down" size={15} color={matches.length ? "ink" : "ink3"} />
                  </Pressable>
                </>
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 px-4"
            >
              {shown.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => jumpTo(item)}
                  className={`h-9 flex-row items-center gap-1.5 rounded-full px-3 ${item.result === "failed" ? "bg-alarm/15" : item.result === "running" ? "bg-live/20" : "bg-raised-2"}`}
                  accessibilityLabel={`Jump to ${item.label}, ${resultWord[item.result]}`}
                >
                  <View className={`h-2 w-2 rounded-[2px] ${resultMark[item.result]}`} />
                  <Text
                    className={`text-[13px] font-semibold ${item.result === "failed" ? "text-alarm-ink" : item.result === "running" ? "text-live-ink" : "text-ink"}`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View className="flex-row items-center gap-2 px-4">
              <Text className="flex-1 text-[13px] text-ink-2">
                {plural(shown.length, "step")}
                {totalWarnings ? ` · ${plural(totalWarnings, "warning")}` : ""}
              </Text>
              <Pressable
                onPress={() =>
                  setExpanded(
                    expanded.size === shown.length
                      ? new Set()
                      : new Set(shown.map((item) => item.key)),
                  )
                }
                className="h-9 justify-center rounded-full bg-raised-2 px-3"
              >
                <Text className="text-[13px] font-semibold text-ink">
                  {expanded.size === shown.length ? "Collapse all" : "Expand all"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void Clipboard.setStringAsync(allText());
                  void Haptics.selectionAsync();
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-raised-2"
                accessibilityLabel="Copy all logs"
              >
                <Icon name="copy" size={14} color="ink" />
              </Pressable>
              <Pressable
                onPress={() => void Share.share({ title, message: allText() })}
                className="h-9 w-9 items-center justify-center rounded-full bg-raised-2"
                accessibilityLabel="Share logs"
              >
                <Icon name="share" size={14} color="ink" />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) =>
          item.type === "header" ? (
            <StepHeader step={item.step} expanded={item.expanded} onToggle={toggle} />
          ) : (
            <LineRow
              number={item.number}
              msg={item.line.msg}
              level={item.line.level}
              matched={matchedIds.has(item.line.id)}
              current={current?.lineId === item.line.id}
            />
          )
        }
      />
      {follow && !following ? (
        <Pressable
          onPress={() => {
            setFollowing(true);
            void list.current?.scrollToEnd({ animated: true });
          }}
          accessibilityRole="button"
          accessibilityLabel="Follow the newest log lines"
          className="absolute bottom-28 self-center flex-row items-center gap-2 rounded-full bg-ink px-4 py-2.5 active:opacity-80"
        >
          <Icon name="down" size={14} color="ground" />
          <Text className="text-[15px] font-semibold text-ground">Follow live</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
