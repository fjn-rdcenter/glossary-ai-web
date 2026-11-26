/**
 * The tab's one push stream, shared by everything that listens to it (the bell, job progress).
 *
 * It is open while at least one listener exists and the tab is visible, so a hidden tab holds no connection,
 * unless a listener asks to keep it open while hidden: the desktop notifier does, in one tab per browser.
 * Listeners that need to know when to fall back to polling watch `isEventStreamConnected`.
 */

import type { JobEvent } from "@/lib/job-events";
import { connectNotificationStream } from "./notification-stream";
import { NotificationService } from "./services/notification.service";

export interface EventStreamListener {
  /** The stream is up, on the first connection and after every reconnect: fetch what you show. */
  onReady?: () => void;
  onNotification?: () => void;
  onJob?: (event: JobEvent) => void;
  /** Keep the stream open while the tab is hidden, for as long as this listener is subscribed. */
  keepOpenWhenHidden?: boolean;
}

const listeners = new Set<EventStreamListener>();
const connectionWatchers = new Set<() => void>();
let connected = false;
let closeStream: (() => void) | null = null;
let generation = 0;

function tell(call: (listener: EventStreamListener) => void) {
  for (const listener of [...listeners]) {
    try {
      call(listener);
    } catch (error) {
      console.error("An event stream listener failed", error);
    }
  }
}

function setConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  connectionWatchers.forEach((watcher) => watcher());
}

function open() {
  const current = ++generation;
  // Callbacks of a stream that was closed meanwhile must not reach the listeners.
  const live = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
    if (current === generation) fn(...args);
  };

  closeStream = connectNotificationStream({
    onConnectionChange: live(setConnected),
    onReady: live(() => tell((listener) => listener.onReady?.())),
    onChange: live(() => tell((listener) => listener.onNotification?.())),
    onJob: live((event: JobEvent) => tell((listener) => listener.onJob?.(event))),
    // A 401 from the stream: any call through the shared client refreshes the session and stores a new token.
    refreshSession: () => NotificationService.getUnreadCount().then(
      () => undefined,
      () => undefined,
    ),
  });
}

function close() {
  generation += 1;
  closeStream?.();
  closeStream = null;
  setConnected(false);
}

function sync() {
  const wanted = [...listeners].some(
    (listener) => listener.keepOpenWhenHidden || document.visibilityState === "visible",
  );
  if (wanted && !closeStream) open();
  else if (!wanted && closeStream) close();
}

/** Listen to the stream. Returns the function that stops listening; the last one to stop closes the stream. */
export function subscribeToEvents(listener: EventStreamListener): () => void {
  if (listeners.size === 0) document.addEventListener("visibilitychange", sync);
  listeners.add(listener);
  sync();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) document.removeEventListener("visibilitychange", sync);
    sync();
  };
}

export function isEventStreamConnected(): boolean {
  return connected;
}

/** Call `callback` whenever the stream goes up or down. Returns the function that stops it. */
export function watchEventStreamConnection(callback: () => void): () => void {
  connectionWatchers.add(callback);
  return () => {
    connectionWatchers.delete(callback);
  };
}
