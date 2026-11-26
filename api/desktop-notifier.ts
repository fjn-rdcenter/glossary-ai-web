/**
 * Which new notifications to announce on the desktop, while a Glossary AI tab is open but the user looks elsewhere.
 *
 * One tab per browser leads (an exclusive Web Lock). It keeps the push stream open even while hidden, fetches the
 * newest notifications on every ping, and hands over those that arrived since it began leading. The other tabs keep
 * their usual stream, open only while visible; when the leader closes, one of them takes over.
 * A tab the user is looking at (visible and focused) holds a shared lock, and the leader stays quiet while any tab
 * holds it: the bell and the page already show the news.
 */

import { getStoredUsername, isSignedIn } from "./auth-session";
import { isEventStreamConnected, subscribeToEvents } from "./event-stream";
import { NotificationService } from "./services/notification.service";
import { takeUnannounced } from "@/lib/notifications";
import { DESKTOP_NOTIFIER_LOCK, LOOKING_LOCK, holdLock, isLockHeld } from "@/lib/tab-locks";
import type { NotificationResponse } from "@/lib/types";

const PAGE_SIZE = 20;
const POLL_WHILE_DISCONNECTED_MS = 60_000;

/** Take part in announcing from this tab: `announce` gets new unread notifications, oldest first. Returns the stop. */
export function runDesktopNotifier(announce: (items: NotificationResponse[]) => void): () => void {
  const stopLooking = markLooking();
  const stopLeading = holdLock(DESKTOP_NOTIFIER_LOCK, "exclusive", () => lead(announce));
  return () => {
    stopLeading();
    stopLooking();
  };
}

/** Hold the shared "looking" lock while this tab is visible and focused. */
function markLooking(): () => void {
  let release: (() => void) | null = null;
  const sync = () => {
    const looking = document.visibilityState === "visible" && document.hasFocus();
    if (looking && !release) release = holdLock(LOOKING_LOCK, "shared");
    if (!looking && release) {
      release();
      release = null;
    }
  };

  sync();
  window.addEventListener("focus", sync);
  window.addEventListener("blur", sync);
  document.addEventListener("visibilitychange", sync);
  return () => {
    window.removeEventListener("focus", sync);
    window.removeEventListener("blur", sync);
    document.removeEventListener("visibilitychange", sync);
    release?.();
  };
}

function lead(announce: (items: NotificationResponse[]) => void): () => void {
  const seen = new Set<string>();
  let baselined = false;
  let owner: string | null = null;
  let stopped = false;
  let queued = false;
  let checks = Promise.resolve();

  const check = async () => {
    if (!isSignedIn()) return;
    const user = getStoredUsername();
    const { items } = await NotificationService.list({ limit: PAGE_SIZE });
    if (stopped) return;

    // What was there when this tab began leading, or when another account signed in, is old news.
    if (!baselined || user !== owner) {
      seen.clear();
      takeUnannounced(items, seen);
      baselined = true;
      owner = user;
      return;
    }
    const fresh = takeUnannounced(items, seen);
    if (fresh.length === 0 || (await isLockHeld(LOOKING_LOCK)) || stopped) return;
    announce(fresh);
  };

  const queueCheck = () => {
    if (queued) return; // a check that has not started yet will see this change too
    queued = true;
    checks = checks.then(() => {
      queued = false;
      return check().catch((error) => console.warn("Could not check for new notifications", error));
    });
  };

  queueCheck(); // the stream may already be up, and then no `ready` comes
  const unsubscribe = subscribeToEvents({ onReady: queueCheck, onNotification: queueCheck, keepOpenWhenHidden: true });
  const timer = window.setInterval(() => {
    if (!isEventStreamConnected()) queueCheck();
  }, POLL_WHILE_DISCONNECTED_MS);

  return () => {
    stopped = true;
    unsubscribe();
    window.clearInterval(timer);
  };
}
