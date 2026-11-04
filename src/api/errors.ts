import { redact } from "@/lib/redact";

export type ApiError =
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "notFound"; message: string }
  | { kind: "rateLimited"; message: string; retryAfterMs?: number }
  | { kind: "network"; message: string }
  | { kind: "timeout"; message: string }
  | { kind: "server"; message: string }
  | {
      kind: "graphql";
      message: string;
      partial: boolean;
      errors: GraphqlErrorShape[];
    };

export type GraphqlErrorShape = {
  message: string;
  path?: (string | number)[];
  extensions?: {
    errorCode?: string;
    errorType?: string;
    isTransient?: boolean;
    [key: string]: unknown;
  };
};

export class KilnApiError extends Error {
  constructor(readonly detail: ApiError) {
    super(detail.message);
    this.name = "KilnApiError";
  }
}

export function errorCopy(error: unknown): string {
  if (error instanceof KilnApiError) return error.detail.message;
  return `Request failed. ${redact(error)}`;
}

export function normalizeHttpError(
  status: number,
  retryAfter?: string | null,
): ApiError {
  if (status === 401)
    return {
      kind: "unauthenticated",
      message: "This token is invalid or revoked. Replace it to continue.",
    };
  if (status === 403)
    return {
      kind: "forbidden",
      message:
        "This token can't access that resource. Ask an owner, or open it in Expo.",
    };
  if (status === 404)
    return {
      kind: "notFound",
      message: "This resource no longer exists, or this token cannot see it.",
    };
  if (status === 429) {
    const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
    return {
      kind: "rateLimited",
      message: "Expo is rate limiting requests. Kiln will retry shortly.",
      retryAfterMs: Number.isFinite(seconds) ? seconds * 1000 : undefined,
    };
  }
  return {
    kind: "server",
    message: `Expo returned ${status}. Try again shortly.`,
  };
}

export function interpretGraphqlPayload<T>(
  payload: { data?: T; errors?: GraphqlErrorShape[] },
  allowPartial = false,
): T {
  if (payload.errors?.length) {
    const authorization = payload.errors.some((error) => {
      const code = error.extensions?.errorCode?.toUpperCase() ?? "";
      return code.includes("AUTH") || code.includes("PERMISSION");
    });
    if (authorization) {
      throw new KilnApiError({
        kind: "forbidden",
        message:
          "This token can't complete that request. Ask an owner, or open it in Expo.",
      });
    }
    if (payload.data && allowPartial) return payload.data;
    throw new KilnApiError({
      kind: "graphql",
      partial: Boolean(payload.data),
      errors: payload.errors,
      message: redact(
        payload.errors[0]?.message ?? "Expo rejected the request.",
      ),
    });
  }
  if (!payload.data) {
    throw new KilnApiError({
      kind: "server",
      message: "Expo returned an empty response. Try again shortly.",
    });
  }
  return payload.data;
}
