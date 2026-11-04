import { afterEach, describe, expect, it } from "vitest";

import {
  interpretGraphqlPayload,
  KilnApiError,
  normalizeHttpError,
} from "@/api/errors";
import { queryKeys } from "@/api/keys";
import { nextCursor, nextOffset } from "@/api/pagination";
import { shouldPollBuild } from "@/api/polling";
import {
  bumpSessionEpoch,
  getSessionEpoch,
  graphqlRequest,
} from "@/api/transport";
import { redact } from "@/lib/redact";
import { tokenRecoveryAction } from "@/lib/token-recovery";

describe("error normalization", () => {
  it("distinguishes authentication, permissions and rate limits", () => {
    expect(normalizeHttpError(401).kind).toBe("unauthenticated");
    expect(normalizeHttpError(403).kind).toBe("forbidden");
    expect(normalizeHttpError(429, "3")).toEqual(
      expect.objectContaining({ kind: "rateLimited", retryAfterMs: 3000 }),
    );
  });

  it("returns opted-in partial data from HTTP 200 GraphQL errors", () => {
    const payload = {
      data: { app: { id: "app-1" } },
      errors: [{ message: "one field is restricted" }],
    };
    expect(interpretGraphqlPayload(payload, true)).toEqual(payload.data);
    expect(() => interpretGraphqlPayload(payload)).toThrow(KilnApiError);
  });

  it("normalizes authorization GraphQL errors", () => {
    expect(() =>
      interpretGraphqlPayload({
        errors: [
          {
            message: "denied",
            extensions: { errorCode: "INSUFFICIENT_PERMISSION" },
          },
        ],
      }),
    ).toThrow(KilnApiError);
  });
});

describe("redaction", () => {
  it("removes bearer and named tokens", () => {
    expect(redact("Authorization: Bearer secret.123 token=also-secret")).toBe(
      "Authorization: [redacted] [redacted]",
    );
  });
});

describe("query scoping and pagination", () => {
  it("always scopes resource keys by account and project", () => {
    expect(queryKeys.build("account-1", "project-1", "build-1")).toEqual([
      "build",
      "account-1",
      "project-1",
      "build-1",
    ]);
  });
  it("stops offset and cursor pagination at the final page", () => {
    expect(nextOffset(30, 30, 2)).toBe(60);
    expect(nextOffset(12, 30, 2)).toBeUndefined();
    expect(nextCursor({ hasNextPage: true, endCursor: "next" })).toBe("next");
    expect(
      nextCursor({ hasNextPage: false, endCursor: "next" }),
    ).toBeUndefined();
  });
});

describe("polling", () => {
  it("runs only for active, focused, foreground, online builds", () => {
    expect(shouldPollBuild("IN_PROGRESS", true, true, true)).toBe(true);
    expect(shouldPollBuild("FINISHED", true, true, true)).toBe(false);
    expect(shouldPollBuild("IN_PROGRESS", false, true, true)).toBe(false);
    expect(shouldPollBuild("IN_QUEUE", true, false, true)).toBe(false);
    expect(shouldPollBuild("NEW", true, true, false)).toBe(false);
  });
});

describe("token recovery and session epochs", () => {
  it("wipes an orphaned encrypted store instead of replacing its key", () => {
    expect(tokenRecoveryAction(false, true)).toBe("wipe-orphan");
    expect(tokenRecoveryAction(false, false)).toBe("signed-out");
    expect(tokenRecoveryAction(true, true)).toBe("restore");
  });

  it("bumps the epoch used to discard late responses", () => {
    const before = getSessionEpoch();
    expect(bumpSessionEpoch()).toBe(before + 1);
  });

  it("discards a response from an older epoch", async () => {
    const originalFetch = globalThis.fetch;
    let resolveResponse: ((response: Response) => void) | undefined;
    globalThis.fetch = (() =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      })) as unknown as typeof fetch;
    const request = graphqlRequest<{ ok: boolean }>(
      "never-logged",
      "query Test { ok }",
      {},
      { attempts: 1 },
    );
    await Promise.resolve();
    bumpSessionEpoch();
    resolveResponse?.(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(request).rejects.toBeDefined();
    globalThis.fetch = originalFetch;
  });
});

afterEach(() => {
  // Every test starts from a fresh logical session boundary.
  bumpSessionEpoch();
});
