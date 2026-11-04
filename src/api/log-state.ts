// Merges signed-file log lines with realtime publications.
//
// Adapted from expo/eas-cli (MIT) packages/eas-cli/src/commandUtils/logs/
// state.ts, checked 2026-11-03. Realtime lines stay hidden until a file fetch
// overlaps them (shares a logId), so the view never shows a gap between the
// last file line and the first streamed one. Once a job completes, whatever
// streamed is revealed regardless.
import { mergeLogLines, type RawLogLine } from "@/api/logs";

type RealtimeLine = RawLogLine & { logId: string };

function isRealtimeLine(entry: unknown): entry is RealtimeLine {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as RawLogLine).logId === "string"
  );
}

export class LogsState {
  private fileLines: RawLogLine[] = [];
  private fileIds = new Set<string>();
  private realtime: RealtimeLine[] = [];
  private realtimeIds = new Set<string>();
  private caughtUp = false;
  private revealed = false;

  ingestFile(lines: RawLogLine[]): void {
    this.fileLines = lines;
    this.fileIds = new Set(lines.flatMap((line) => (line.logId ? [line.logId] : [])));
    if (!this.caughtUp && this.realtime.some((line) => this.fileIds.has(line.logId)))
      this.caughtUp = true;
    this.realtime = this.realtime.filter((line) => !this.fileIds.has(line.logId));
    this.realtimeIds = new Set(this.realtime.map((line) => line.logId));
    if (this.caughtUp) this.revealed = true;
  }

  /** Returns true when the visible lines changed. */
  ingestRealtime(data: unknown): boolean {
    if (!Array.isArray(data)) return false;
    const published = data.filter(isRealtimeLine);
    if (!published.length) return false;
    if (!this.caughtUp && published.some((line) => this.fileIds.has(line.logId)))
      this.caughtUp = true;
    const fresh = published.filter(
      (line) => !this.fileIds.has(line.logId) && !this.realtimeIds.has(line.logId),
    );
    for (const line of fresh) {
      this.realtime.push(line);
      this.realtimeIds.add(line.logId);
    }
    if (!this.revealed && this.caughtUp) {
      this.revealed = true;
      return true;
    }
    return this.revealed && fresh.length > 0;
  }

  markCompleted(): void {
    this.revealed = true;
  }

  /** Lines have streamed in but no file fetch has overlapped them yet. */
  get waitingForCatchUp(): boolean {
    return !this.revealed && this.realtime.length > 0;
  }

  get streamedCount(): number {
    return this.revealed ? this.realtime.length : 0;
  }

  lines(): RawLogLine[] {
    return this.revealed ? mergeLogLines(this.fileLines, this.realtime) : this.fileLines;
  }
}
