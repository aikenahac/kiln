import {
  interpretGraphqlPayload,
  KilnApiError,
  normalizeHttpError,
  type GraphqlErrorShape,
} from "@/api/errors";

const ENDPOINT = "https://api.expo.dev/graphql";
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

type GraphqlResponse<T> = { data?: T; errors?: GraphqlErrorShape[] };
type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  allowPartial?: boolean;
  attempts?: number;
};

let sessionEpoch = 0;
const controllers = new Set<AbortController>();

export function getSessionEpoch(): number {
  return sessionEpoch;
}
export function bumpSessionEpoch(): number {
  sessionEpoch += 1;
  for (const controller of controllers) controller.abort();
  controllers.clear();
  return sessionEpoch;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function graphqlRequest<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
  options: RequestOptions = {},
): Promise<T> {
  const epoch = sessionEpoch;
  const attempts = options.attempts ?? 3;
  const controller = new AbortController();
  controllers.add(controller);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const timeout = setTimeout(
        () => controller.abort("timeout"),
        options.timeoutMs ?? 15_000,
      );
      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });
        if (epoch !== sessionEpoch)
          throw new DOMException(
            "Discarded stale session response",
            "AbortError",
          );
        if (!response.ok) {
          const detail = normalizeHttpError(
            response.status,
            response.headers.get("retry-after"),
          );
          if (TRANSIENT.has(response.status) && attempt + 1 < attempts) {
            const wait =
              detail.kind === "rateLimited" && detail.retryAfterMs
                ? detail.retryAfterMs
                : 350 * 2 ** attempt + Math.random() * 200;
            clearTimeout(timeout);
            await delay(wait, controller.signal);
            continue;
          }
          throw new KilnApiError(detail);
        }
        const payload = (await response.json()) as GraphqlResponse<T>;
        if (payload.errors?.length) {
          const transient = payload.errors.every(
            (error) => error.extensions?.isTransient,
          );
          if (transient && attempt + 1 < attempts) {
            clearTimeout(timeout);
            await delay(
              350 * 2 ** attempt + Math.random() * 200,
              controller.signal,
            );
            continue;
          }
        }
        return interpretGraphqlPayload(payload, options.allowPartial);
      } catch (error) {
        if (error instanceof KilnApiError) throw error;
        if (controller.signal.aborted) {
          if (epoch !== sessionEpoch || options.signal?.aborted) throw error;
          throw new KilnApiError({
            kind: "timeout",
            message:
              "Expo did not respond in 15 seconds. Check the connection and try again.",
          });
        }
        if (attempt + 1 >= attempts)
          throw new KilnApiError({
            kind: "network",
            message:
              "Expo could not be reached. Check the connection and try again.",
          });
        clearTimeout(timeout);
        await delay(
          350 * 2 ** attempt + Math.random() * 200,
          controller.signal,
        );
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new KilnApiError({
      kind: "network",
      message: "Expo could not be reached. Check the connection and try again.",
    });
  } finally {
    controllers.delete(controller);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchSignedText(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(url, { signal, redirect: "follow" });
  if (!response.ok)
    throw new KilnApiError(
      normalizeHttpError(response.status, response.headers.get("retry-after")),
    );
  return response.text();
}
