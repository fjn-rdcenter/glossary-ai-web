/**
 * The push side of the notification bell: a stream of "something changed" pings from the API.
 *
 * Push is an accelerator, never the baseline. The bell keeps polling, so every failure here (no token, a
 * proxy that buffers, a full cap, a dropped connection) only means the ping does not arrive and the next poll
 * finds the change. This module therefore never throws and never shows anything: it reconnects quietly, with
 * a growing delay.
 *
 * It uses `fetch` and the bearer token because `EventSource` cannot send an `Authorization` header, and the
 * token must stay out of query strings. A 401 hands over to `refreshSession`, which must go through the
 * shared axios client: that client owns the refresh-token rotation, and two refreshes at once would look like
 * a stolen token and sign the user out.
 */

import { createRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";
import { createSseParser, reconnectDelay } from "@/lib/sse";
import { getStoredAccessToken } from "./auth-session";
import { API_CONFIG } from "./config";

export interface NotificationStreamHandlers {
  /** The stream is up (the server said "ready"). Whatever was missed while it was down is still to be fetched. */
  onReady: () => void;
  /** The server says the user's notifications changed. Carries no data: fetch the count and the list. */
  onChange: () => void;
  /** The server refused the token. Settle once a fresh one is stored, or when it is clear none will be. */
  refreshSession: () => Promise<void>;
}

/** Everything the stream takes from its surroundings, so a check can stand in for it. */
export interface NotificationStreamDeps {
  fetch?: (input: string, init: RequestInit) => Promise<Response>;
  getToken?: () => string | null;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  url?: string;
}

/** The server sends "ready" at once; a proxy that buffers the response would hold it back. */
const FIRST_BYTES_TIMEOUT_MS = 15_000;
/** The server sends a keep-alive every 20 s when quiet, so this long without a byte means the link is dead. */
const SILENCE_TIMEOUT_MS = 90_000;
/** A stream that ends sooner than this counts as a failure, so a server that closes streams at once is not hammered. */
const HEALTHY_AFTER_MS = 5_000;

type Attempt =
  | { kind: "ended"; wasReady: boolean; lastedMs: number }
  | { kind: "unauthorized" }
  | { kind: "failed" };

function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

function runHandler(handler: () => void): void {
  try {
    handler();
  } catch (error) {
    console.error("A notification stream handler failed", error);
  }
}

async function attemptOnce(
  handlers: NotificationStreamHandlers,
  deps: Required<NotificationStreamDeps>,
  signal: AbortSignal,
): Promise<Attempt> {
  const token = deps.getToken();
  if (!token) return { kind: "failed" };

  const attempt = new AbortController();
  const abortAttempt = () => attempt.abort();
  signal.addEventListener("abort", abortAttempt, { once: true });
  let timer = setTimeout(abortAttempt, FIRST_BYTES_TIMEOUT_MS);
  const startedAt = Date.now();
  let wasReady = false;

  try {
    const response = await deps.fetch(deps.url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream", [REQUEST_ID_HEADER]: createRequestId() },
      cache: "no-store",
      signal: attempt.signal,
    });
    if (response.status === 401) return { kind: "unauthorized" };
    if (!response.ok || !response.body) return { kind: "failed" };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser((event) => {
      if (event.event === "ready") {
        wasReady = true;
        runHandler(handlers.onReady);
      } else if (event.event === "notification") {
        runHandler(handlers.onChange);
      }
    });

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // Any bytes, keep-alives included, show the link is alive.
      clearTimeout(timer);
      timer = setTimeout(abortAttempt, SILENCE_TIMEOUT_MS);
      parser.push(decoder.decode(value, { stream: true }));
    }
    return { kind: "ended", wasReady, lastedMs: Date.now() - startedAt };
  } catch {
    return { kind: "failed" }; // a network error, or this attempt was aborted for silence
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abortAttempt);
    attempt.abort(); // releases the connection if we left early
  }
}

async function run(handlers: NotificationStreamHandlers, deps: Required<NotificationStreamDeps>, signal: AbortSignal) {
  let failures = 0;

  while (!signal.aborted) {
    const result = await attemptOnce(handlers, deps, signal);
    if (signal.aborted) return;

    if (result.kind === "unauthorized") {
      await handlers.refreshSession().catch(() => undefined);
      failures += 1;
    } else if (result.kind === "ended" && result.wasReady && result.lastedMs >= HEALTHY_AFTER_MS) {
      failures = 0; // it worked; the usual end is the token expiring, so reconnect with the fresh one
    } else {
      failures += 1;
    }

    await deps.wait(reconnectDelay(failures > 0 ? failures - 1 : 0), signal);
  }
}

/** Keep one stream open until the returned function is called. Never throws. */
export function connectNotificationStream(
  handlers: NotificationStreamHandlers,
  deps: NotificationStreamDeps = {},
): () => void {
  const controller = new AbortController();
  const resolved: Required<NotificationStreamDeps> = {
    fetch: deps.fetch ?? ((input, init) => fetch(input, init)),
    getToken: deps.getToken ?? getStoredAccessToken,
    wait: deps.wait ?? waitFor,
    url: deps.url ?? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS.STREAM}`,
  };

  void run(handlers, resolved, controller.signal);
  return () => controller.abort();
}
