import { describe, expect, it } from "vitest";

import { LogsState } from "@/api/log-state";

const l = (logId: string) => ({ logId, msg: logId, phase: "RUN_GRADLEW" });

describe("realtime log merge", () => {
  it("hides streamed lines until a file fetch overlaps them", () => {
    const state = new LogsState();
    state.ingestFile([l("1"), l("2")]);
    // Lines 5-6 arrive, but 3-4 are missing between file and stream.
    expect(state.ingestRealtime([l("5"), l("6")])).toBe(false);
    expect(state.lines().map((line) => line.logId)).toEqual(["1", "2"]);
    // Next file fetch reaches line 5: caught up, stream revealed, no duplicates.
    state.ingestFile([l("1"), l("2"), l("3"), l("4"), l("5")]);
    expect(state.lines().map((line) => line.logId)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("reveals immediately when a publication overlaps the file", () => {
    const state = new LogsState();
    state.ingestFile([l("1"), l("2")]);
    expect(state.ingestRealtime([l("2"), l("3")])).toBe(true);
    expect(state.lines().map((line) => line.logId)).toEqual(["1", "2", "3"]);
    expect(state.ingestRealtime([l("3")])).toBe(false);
    expect(state.ingestRealtime([l("4")])).toBe(true);
    expect(state.streamedCount).toBe(2);
  });

  it("ignores malformed publications", () => {
    const state = new LogsState();
    expect(state.ingestRealtime({ not: "an array" })).toBe(false);
    expect(state.ingestRealtime([{ msg: "no id" }])).toBe(false);
  });

  it("reveals whatever streamed once the job completes", () => {
    const state = new LogsState();
    state.ingestFile([l("1")]);
    state.ingestRealtime([l("9")]);
    state.markCompleted();
    expect(state.lines().map((line) => line.logId)).toEqual(["1", "9"]);
  });
});
