import { describe, expect, it } from "vitest";

import {
  defaultExpanded,
  findMatches,
  flattenSteps,
  groupLogLinesIntoSteps,
  mergeLogLines,
  parseLogLines,
  phasesFromSteps,
  statusLamps,
  visibleSteps,
} from "@/api/logs";

const t = (seconds: number) => new Date(Date.UTC(2026, 10, 3, 10, 0, seconds)).toISOString();
const line = (value: Record<string, unknown>) => JSON.stringify(value);

// Shape of EAS build JSONL: bunyan levels, phase + marker + result.
const FAILED_BUILD = [
  line({ logId: "1", phase: "QUEUE", marker: "START_PHASE", msg: "Waiting to start", time: t(0), level: 30 }),
  line({ logId: "2", phase: "QUEUE", marker: "END_PHASE", result: "success", msg: "", time: t(8), level: 30 }),
  line({ logId: "3", phase: "INSTALL_DEPENDENCIES", marker: "START_PHASE", msg: "Installing", time: t(10), level: 30 }),
  line({ logId: "4", phase: "INSTALL_DEPENDENCIES", msg: "pnpm install --frozen-lockfile", time: t(11), level: 30 }),
  line({ logId: "5", phase: "INSTALL_DEPENDENCIES", marker: "END_PHASE", result: "success", msg: "", time: t(27), level: 30 }),
  line({ logId: "6", phase: "RUN_EXPO_DOCTOR", msg: "1 check failed", time: t(28), level: 40 }),
  line({ logId: "7", phase: "RUN_EXPO_DOCTOR", marker: "END_PHASE", result: "warning", msg: "", time: t(37), level: 30 }),
  line({ logId: "8", phase: "CACHE_STATS", marker: "END_PHASE", result: "skipped", msg: "", time: t(37) }),
  line({ logId: "9", phase: "RUN_GRADLEW", msg: "> Task :app:compileReleaseKotlin FAILED", time: t(40), level: 50 }),
  line({ logId: "10", phase: "RUN_GRADLEW", marker: "END_PHASE", result: "failed", msg: "", time: t(311), level: 30 }),
  "not json at all",
].join("\n");

describe("log parsing", () => {
  it("keeps non-JSON lines as raw text", () => {
    const parsed = parseLogLines(FAILED_BUILD);
    expect(parsed).toHaveLength(11);
    expect(parsed.at(-1)).toEqual({ msg: "not json at all" });
  });

  it("dedupes merged files by logId, later file wins", () => {
    const merged = mergeLogLines(
      [{ logId: "a", msg: "old" }, { logId: "b", msg: "b" }],
      [{ logId: "a", msg: "new" }],
    );
    expect(merged.map((item) => item.msg)).toEqual(["b", "new"]);
  });
});

describe("step grouping", () => {
  const steps = groupLogLinesIntoSteps(parseLogLines(FAILED_BUILD));

  it("groups by phase with display names, results and durations", () => {
    expect(steps.map((step) => [step.label, step.result])).toEqual([
      ["Waiting to start", "success"],
      ["Install dependencies", "success"],
      ["Run expo doctor", "warning"],
      ["Cache stats", "skipped"],
      ["Run gradlew", "failed"],
    ]);
    expect(steps[1]!.durationSeconds).toBe(17);
    expect(steps[4]!.durationSeconds).toBe(271);
  });

  it("counts warnings and errors, and drops empty marker lines", () => {
    expect(steps[2]!.warnings).toBe(1);
    expect(steps[4]!.errors).toBe(1);
    expect(steps[1]!.lines.map((item) => item.msg)).toEqual([
      "Installing",
      "pnpm install --frozen-lockfile",
    ]);
  });

  it("keeps unkeyed lines in the current step", () => {
    expect(steps[4]!.lines.at(-1)!.msg).toBe("not json at all");
  });

  it("marks the last open step running while the job is active", () => {
    const running = groupLogLinesIntoSteps(
      parseLogLines(
        [
          line({ phase: "QUEUE", marker: "END_PHASE", result: "success", msg: "", time: t(1) }),
          line({ phase: "RUN_FASTLANE", msg: "building", time: t(2) }),
        ].join("\n"),
      ),
      true,
    );
    expect(running.at(-1)!.result).toBe("running");
    expect(defaultExpanded(running)).toEqual(new Set(["RUN_FASTLANE"]));
  });

  it("uses custom step ids and display names (workflow jobs)", () => {
    const custom = groupLogLinesIntoSteps([
      { buildStepId: "checkout", buildStepDisplayName: "Checkout", msg: "git clone" },
      { buildStepId: "checkout", marker: "end-step", result: "success", msg: "done" },
    ]);
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ key: "checkout", label: "Checkout", result: "success" });
  });
});

describe("lamps", () => {
  it("derives lamps from real phases, failing the phase that failed", () => {
    const lamps = phasesFromSteps(groupLogLinesIntoSteps(parseLogLines(FAILED_BUILD)));
    expect(lamps.map((lamp) => [lamp.name, lamp.state])).toEqual([
      ["Queue", "done"],
      ["Prepare", "done"],
      ["Install", "done"],
      ["Gradlew", "failed"],
    ]);
    expect(lamps[3]!.duration).toBe("4:31");
  });

  it("status-only lamps never claim a specific phase", () => {
    expect(statusLamps("ERRORED").map((lamp) => lamp.name)).toEqual(["Queue", "Run", "Done"]);
    expect(statusLamps("IN_QUEUE")[0]!.state).toBe("live");
    expect(statusLamps("FINISHED").every((lamp) => lamp.state === "done")).toBe(true);
  });
});

describe("accordion and search", () => {
  const steps = visibleSteps(groupLogLinesIntoSteps(parseLogLines(FAILED_BUILD)));

  it("hides skipped steps", () => {
    expect(steps.some((step) => step.key === "CACHE_STATS")).toBe(false);
  });

  it("collapsed steps contribute only a header row", () => {
    const collapsed = flattenSteps(steps, new Set());
    expect(collapsed.every((row) => row.type === "header")).toBe(true);
    const open = flattenSteps(steps, new Set(["RUN_GRADLEW"]));
    expect(open.filter((row) => row.type === "line")).toHaveLength(steps.at(-1)!.lines.length);
  });

  it("finds matches across collapsed steps, case-insensitively", () => {
    const matches = findMatches(steps, "PNPM");
    expect(matches).toEqual([{ stepKey: "INSTALL_DEPENDENCIES", lineId: "4" }]);
    expect(findMatches(steps, "  ")).toEqual([]);
  });
});
