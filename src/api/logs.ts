// Log parsing and step grouping.
//
// Adapted from expo/eas-cli (MIT): packages/eas-cli/src/commandUtils/logs/
// parseLogs.ts (parseLogLines, mergeLogLines, groupLogLinesIntoSteps) and the
// phase display names in @expo/eas-build-job 27.4.0 dist/logs.js
// (buildPhaseDisplayName, submissionPhaseDisplayName, BuildPhaseResult,
// LogMarker). Checked 2026-11-03.
import { KilnApiError } from "@/api/errors";
import { fetchSignedText } from "@/api/transport";
import type { LampPhase } from "@/components/phase-lamps";
import { duration } from "@/lib/format";

export type RawLogLine = {
  logId?: string;
  buildStepId?: string;
  buildStepDisplayName?: string;
  phase?: string;
  time?: string;
  msg?: string;
  result?: string;
  marker?: string;
  level?: number;
  err?: unknown;
};

export type LogLine = {
  id: string;
  time?: string;
  msg: string;
  level?: number;
  marker?: string;
};

export type StepResult =
  | "success"
  | "failed"
  | "warning"
  | "skipped"
  | "running"
  | "unknown";

export type LogStep = {
  key: string;
  label: string;
  result: StepResult;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  lines: LogLine[];
  warnings: number;
  errors: number;
};

export const phaseDisplayName: Record<string, string> = {
  UNKNOWN: "Unknown build phase",
  QUEUE: "Waiting to start",
  SPIN_UP_BUILDER: "Spin up build environment",
  SET_UP_BUILD_ENVIRONMENT: "Set up build environment",
  BUILDER_INFO: "Builder environment info",
  START_BUILD: "Start build",
  INSTALL_CUSTOM_TOOLS: "Install custom tools",
  SSH_SESSION: "Start SSH session",
  PREPARE_PROJECT: "Prepare project",
  RESTORE_CACHE: "Restore cache",
  INSTALL_DEPENDENCIES: "Install dependencies",
  EAS_BUILD_INTERNAL: "Resolve build configuration",
  PREBUILD: "Prebuild",
  PREPARE_CREDENTIALS: "Prepare credentials",
  CONFIGURE_ANDROID_VERSION: "Configure Android version",
  CALCULATE_EXPO_UPDATES_RUNTIME_VERSION:
    "Calculate expo-updates runtime version",
  CONFIGURE_EXPO_UPDATES: "Configure expo-updates",
  EAGER_BUNDLE: "Bundle JavaScript",
  SAVE_CACHE: "Save cache",
  CACHE_STATS: "Cache stats",
  UPLOAD_ARTIFACTS: "Upload artifacts",
  UPLOAD_APPLICATION_ARCHIVE: "Upload application archive",
  UPLOAD_EMBEDDED_BUNDLE: "Upload embedded bundle",
  UPLOAD_BUILD_ARTIFACTS: "Upload build artifacts",
  PREPARE_ARTIFACTS: "Prepare artifacts",
  CLEAN_UP_CREDENTIALS: "Clean up credentials",
  COMPLETE_BUILD: "Complete build",
  FAIL_BUILD: "Fail job",
  READ_APP_CONFIG: "Read app config",
  READ_PACKAGE_JSON: "Read package.json",
  READ_EAS_JSON: "Read eas.json",
  RUN_EXPO_DOCTOR: "Run expo doctor",
  DOWNLOAD_APPLICATION_ARCHIVE: "Download application archive",
  FIX_GRADLEW: "Fix gradlew",
  RUN_GRADLEW: "Run gradlew",
  GRADLE_BUILD_PROFILE: "Gradle build profile",
  INSTALL_PODS: "Install pods",
  CONFIGURE_XCODE_PROJECT: "Configure Xcode project",
  RUN_FASTLANE: "Run fastlane",
  PARSE_XCACTIVITYLOG: "Analyze build performance",
  PRE_INSTALL_HOOK: "Pre-install hook",
  POST_INSTALL_HOOK: "Post-install hook",
  PRE_UPLOAD_ARTIFACTS_HOOK: "Pre-upload-artifacts hook",
  ON_BUILD_SUCCESS_HOOK: "Build success hook",
  ON_BUILD_ERROR_HOOK: "Build error hook",
  ON_BUILD_COMPLETE_HOOK: "Build complete hook",
  ON_BUILD_CANCEL_HOOK: "Build cancel hook",
  CUSTOM: "Unknown build phase",
  PARSE_CUSTOM_WORKFLOW_CONFIG: "Parse custom build config",
  COMPLETE_JOB: "Complete job",
  SPIN_UP_SUBMISSION_WORKER: "Spin up submission worker",
  SUBMIT_TO_PLAY_STORE: "Submit to Play Store",
  SUBMIT_TO_APP_STORE: "Submit to App Store",
  FAIL_SUBMISSION: "Fail submission",
};

/** One JSON object per line. Lines that are not JSON keep their raw text. */
export function parseLogLines(rawLogs: string): RawLogLine[] {
  const lines: RawLogLine[] = [];
  for (const raw of rawLogs.split("\n")) {
    if (!raw.trim()) continue;
    try {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        lines.push(value as RawLogLine);
      } else {
        lines.push({ msg: raw });
      }
    } catch {
      lines.push({ msg: raw });
    }
  }
  return lines;
}

/** Later files win when two files carry the same logId. */
export function mergeLogLines(...groups: RawLogLine[][]): RawLogLine[] {
  const seen = new Set<string>();
  const merged: RawLogLine[] = [];
  const all = groups.flat();
  for (let index = all.length - 1; index >= 0; index -= 1) {
    const line = all[index]!;
    if (line.logId) {
      if (seen.has(line.logId)) continue;
      seen.add(line.logId);
    }
    merged.push(line);
  }
  return merged.reverse();
}

function normalizeResult(result: string | undefined): StepResult | undefined {
  switch (result) {
    case "success":
    case "failed":
    case "warning":
    case "skipped":
    case "unknown":
      return result;
    case undefined:
      return undefined;
    default:
      return "unknown";
  }
}

function secondsBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const value = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Groups lines by `buildStepId ?? buildStepDisplayName ?? phase`, the same
 * key eas-cli uses. A step's result comes from its END_PHASE / end-step
 * marker. A step with no end marker is "running" while the job is active and
 * "unknown" otherwise. Lines without a step key stay with the current step.
 */
export function groupLogLinesIntoSteps(
  lines: RawLogLine[],
  jobActive = false,
): LogStep[] {
  const steps = new Map<string, LogStep>();
  let current: LogStep | undefined;
  let counter = 0;
  for (const raw of lines) {
    const key = raw.buildStepId ?? raw.buildStepDisplayName ?? raw.phase;
    const label =
      raw.buildStepDisplayName ??
      (raw.phase ? (phaseDisplayName[raw.phase] ?? raw.phase) : undefined) ??
      raw.buildStepId;
    let step = key ? steps.get(key) : current;
    if (!step) {
      const stepKey = key ?? "__log";
      step = {
        key: stepKey,
        label: label ?? "Log",
        result: "unknown",
        lines: [],
        warnings: 0,
        errors: 0,
      };
      steps.set(stepKey, step);
    }
    if (raw.buildStepDisplayName) step.label = raw.buildStepDisplayName;
    current = step;
    if (raw.time) {
      step.startedAt ??= raw.time;
      step.endedAt = raw.time;
    }
    const isEnd = raw.marker === "END_PHASE" || raw.marker === "end-step";
    if (isEnd) {
      const result = normalizeResult(raw.result ?? "");
      if (result) step.result = result;
      step.durationSeconds = secondsBetween(step.startedAt, step.endedAt);
    }
    if (raw.level !== undefined && raw.level >= 50) step.errors += 1;
    else if (raw.level !== undefined && raw.level >= 40) step.warnings += 1;
    // Marker lines are bookkeeping; eas-cli keeps them, but they have no text
    // worth showing beyond the result already on the header.
    if (raw.msg === undefined || (raw.marker && !raw.msg)) continue;
    counter += 1;
    step.lines.push({
      id: raw.logId ?? `${step.key}:${counter}`,
      time: raw.time,
      msg: raw.msg,
      level: raw.level,
      marker: raw.marker,
    });
  }
  const ordered = [...steps.values()];
  for (const step of ordered) {
    step.durationSeconds ??= secondsBetween(step.startedAt, step.endedAt);
  }
  if (jobActive) {
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      const step = ordered[index]!;
      if (step.result === "unknown") {
        step.result = "running";
        break;
      }
    }
  }
  return ordered;
}

/** Steps that a reader sees. Skipped steps are hidden, as on expo.dev. */
export function visibleSteps(steps: LogStep[]): LogStep[] {
  return steps.filter((step) => step.result !== "skipped");
}

// Lamp groups: a build has ~25 phases, the lamp row shows at most seven.
// Keys are BuildPhase names from @expo/eas-build-job.
const LAMP_GROUPS: { name: string; phases: string[] }[] = [
  {
    name: "Queue",
    phases: [
      "QUEUE",
      "SPIN_UP_BUILDER",
      "SET_UP_BUILD_ENVIRONMENT",
      "BUILDER_INFO",
      "START_BUILD",
      "SPIN_UP_SUBMISSION_WORKER",
    ],
  },
  {
    name: "Prepare",
    phases: [
      "INSTALL_CUSTOM_TOOLS",
      "PREPARE_PROJECT",
      "READ_EAS_JSON",
      "READ_PACKAGE_JSON",
      "READ_APP_CONFIG",
      "RUN_EXPO_DOCTOR",
      "RESTORE_CACHE",
      "EAS_BUILD_INTERNAL",
      "PARSE_CUSTOM_WORKFLOW_CONFIG",
      "PRE_INSTALL_HOOK",
      "DOWNLOAD_APPLICATION_ARCHIVE",
    ],
  },
  { name: "Install", phases: ["INSTALL_DEPENDENCIES", "POST_INSTALL_HOOK"] },
  {
    name: "Prebuild",
    phases: [
      "PREBUILD",
      "PREPARE_CREDENTIALS",
      "CONFIGURE_ANDROID_VERSION",
      "CALCULATE_EXPO_UPDATES_RUNTIME_VERSION",
      "CONFIGURE_EXPO_UPDATES",
      "EAGER_BUNDLE",
      "CONFIGURE_XCODE_PROJECT",
    ],
  },
  { name: "Pods", phases: ["INSTALL_PODS"] },
  {
    name: "Compile",
    phases: [
      "RUN_FASTLANE",
      "RUN_GRADLEW",
      "FIX_GRADLEW",
      "GRADLE_BUILD_PROFILE",
      "PARSE_XCACTIVITYLOG",
    ],
  },
  {
    name: "Submit",
    phases: ["SUBMIT_TO_APP_STORE", "SUBMIT_TO_PLAY_STORE"],
  },
  {
    name: "Upload",
    phases: [
      "PRE_UPLOAD_ARTIFACTS_HOOK",
      "UPLOAD_ARTIFACTS",
      "UPLOAD_APPLICATION_ARCHIVE",
      "UPLOAD_EMBEDDED_BUNDLE",
      "UPLOAD_BUILD_ARTIFACTS",
      "PREPARE_ARTIFACTS",
      "SAVE_CACHE",
      "CACHE_STATS",
      "CLEAN_UP_CREDENTIALS",
      "COMPLETE_BUILD",
      "COMPLETE_JOB",
    ],
  },
];

function lampState(results: StepResult[]): LampPhase["state"] {
  if (results.includes("failed")) return "failed";
  if (results.includes("running")) return "live";
  if (
    results.length > 0 &&
    results.every((result) => result !== "unknown")
  )
    return "done";
  return "off";
}

/**
 * Lamps derived from real steps. Known EAS build phases collapse into named
 * groups; custom steps (workflow jobs, custom builds) show one lamp per step,
 * windowed around the failed or running step when there are too many.
 */
export function phasesFromSteps(steps: LogStep[]): LampPhase[] {
  const shown = visibleSteps(steps).filter(
    (step) => step.key !== "__log" && !step.key.startsWith("ON_BUILD_"),
  );
  const known = shown.filter((step) => step.key in phaseDisplayName);
  if (known.length >= shown.length / 2 && known.length > 0) {
    const lamps: LampPhase[] = [];
    for (const group of LAMP_GROUPS) {
      const members = known.filter((step) => group.phases.includes(step.key));
      if (!members.length) continue;
      const seconds = members.reduce(
        (sum, step) => sum + (step.durationSeconds ?? 0),
        0,
      );
      lamps.push({
        name:
          group.name === "Compile"
            ? members.some((step) => step.key === "RUN_FASTLANE")
              ? "Fastlane"
              : members.some((step) => step.key === "RUN_GRADLEW")
                ? "Gradlew"
                : group.name
            : group.name,
        state: lampState(members.map((step) => step.result)),
        duration: seconds >= 1 ? duration(seconds) : undefined,
      });
    }
    // A failure in a phase outside the groups (FAIL_BUILD, custom) still
    // needs to show, so mark the first lamp that never finished.
    if (
      known.some(
        (step) =>
          step.result === "failed" &&
          !LAMP_GROUPS.some((group) => group.phases.includes(step.key)),
      ) &&
      !lamps.some((lamp) => lamp.state === "failed")
    ) {
      const firstOpen = lamps.find((lamp) => lamp.state === "off");
      if (firstOpen) firstOpen.state = "failed";
    }
    return lamps;
  }
  const lamps = shown.map(
    (step): LampPhase => ({
      name: step.label,
      state: lampState([step.result]),
      duration:
        step.durationSeconds && step.durationSeconds >= 1
          ? duration(step.durationSeconds)
          : undefined,
    }),
  );
  if (lamps.length <= 7) return lamps;
  const focus = Math.max(
    lamps.findIndex((lamp) => lamp.state === "failed" || lamp.state === "live"),
    0,
  );
  const start = Math.min(Math.max(focus - 3, 0), lamps.length - 7);
  return lamps.slice(start, start + 7);
}

/**
 * Lamps for rows that have no logs loaded. Three generic stages, so a list
 * never claims a specific phase it hasn't read.
 */
export function statusLamps(
  status: string,
): LampPhase[] {
  const terminalFailed = status === "ERRORED" || status === "FAILURE";
  const finished = status === "FINISHED" || status === "SUCCESS";
  const running = status === "IN_PROGRESS" || status === "PENDING_CANCEL";
  const queued =
    status === "NEW" ||
    status === "IN_QUEUE" ||
    status === "AWAITING_BUILD" ||
    status === "WAITING";
  return [
    { name: "Queue", state: queued ? "live" : "done" },
    {
      name: "Run",
      state: terminalFailed
        ? "failed"
        : running
          ? "live"
          : finished
            ? "done"
            : "off",
    },
    { name: "Done", state: finished ? "done" : "off" },
  ];
}

export class ExpiredLogError extends Error {
  constructor() {
    super("The signed log URL expired.");
    this.name = "ExpiredLogError";
  }
}

/** Downloads signed log files without the Expo token. */
export async function loadLogFiles(
  urls: string[],
  signal?: AbortSignal,
): Promise<RawLogLine[]> {
  try {
    const contents = await Promise.all(
      urls.map((url) => fetchSignedText(url, signal)),
    );
    return mergeLogLines(...contents.map(parseLogLines));
  } catch (error) {
    if (
      error instanceof KilnApiError &&
      (error.detail.kind === "forbidden" ||
        error.detail.kind === "notFound" ||
        error.detail.kind === "unauthenticated")
    )
      throw new ExpiredLogError();
    throw error;
  }
}

// Accordion rows. Collapsed steps contribute only their header row, so the
// list stays virtualized line by line.
export type LogRow =
  | { type: "header"; key: string; step: LogStep; expanded: boolean }
  | { type: "line"; key: string; stepKey: string; line: LogLine; number: number };

export function flattenSteps(
  steps: LogStep[],
  expanded: ReadonlySet<string>,
): LogRow[] {
  const rows: LogRow[] = [];
  for (const step of steps) {
    const open = expanded.has(step.key);
    rows.push({ type: "header", key: `h:${step.key}`, step, expanded: open });
    if (!open) continue;
    step.lines.forEach((line, index) =>
      rows.push({
        type: "line",
        key: `l:${step.key}:${line.id}`,
        stepKey: step.key,
        line,
        number: index + 1,
      }),
    );
  }
  return rows;
}

/** Failed and running steps open by default; a clean log opens none. */
export function defaultExpanded(steps: LogStep[]): Set<string> {
  return new Set(
    steps
      .filter((step) => step.result === "failed" || step.result === "running")
      .map((step) => step.key),
  );
}

export type LogMatch = { stepKey: string; lineId: string };

export function findMatches(steps: LogStep[], search: string): LogMatch[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return [];
  const matches: LogMatch[] = [];
  for (const step of steps)
    for (const line of step.lines)
      if (line.msg.toLowerCase().includes(needle))
        matches.push({ stepKey: step.key, lineId: line.id });
  return matches;
}

export function stepText(step: LogStep): string {
  return step.lines.map((line) => line.msg).join("\n");
}
