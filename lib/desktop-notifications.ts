/**
 * Whether this browser shows desktop notifications for Glossary AI, and the switch that turns them on.
 *
 * The browser's permission belongs to the whole origin, which production shares with other products, so a grant
 * made for one of them does not turn Glossary AI's notifications on: the user's own choice, stored per browser,
 * must say so too.
 */

import { DESKTOP_NOTIFICATIONS_STORAGE_KEY } from "./storage-keys";

/** `blocked`: the browser denies the permission, and only the site settings can lift that. */
export type DesktopNotificationState = "unsupported" | "blocked" | "off" | "on";

const changeWatchers = new Set<() => void>();

function notifyWatchers() {
  changeWatchers.forEach((watcher) => watcher());
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && window.isSecureContext;
}

export function getDesktopNotificationState(): DesktopNotificationState {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const chosen = localStorage.getItem(DESKTOP_NOTIFICATIONS_STORAGE_KEY) === "on";
  return chosen && Notification.permission === "granted" ? "on" : "off";
}

/** Call `callback` when the state may have changed: here, in another tab, or in the browser's site settings. */
export function watchDesktopNotificationState(callback: () => void): () => void {
  if (!isSupported()) return () => undefined;

  let stopped = false;
  let permission: PermissionStatus | null = null;
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DESKTOP_NOTIFICATIONS_STORAGE_KEY) callback();
  };

  changeWatchers.add(callback);
  window.addEventListener("storage", onStorage);
  navigator.permissions?.query({ name: "notifications" }).then(
    (status) => {
      if (stopped) return;
      permission = status;
      status.addEventListener("change", callback);
    },
    () => undefined,
  );

  return () => {
    stopped = true;
    changeWatchers.delete(callback);
    window.removeEventListener("storage", onStorage);
    permission?.removeEventListener("change", callback);
  };
}

/** Turn desktop notifications on. Call it from a click: browsers ask for the permission only after a user gesture. */
export async function enableDesktopNotifications(): Promise<void> {
  if (!isSupported()) return;
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission === "granted") localStorage.setItem(DESKTOP_NOTIFICATIONS_STORAGE_KEY, "on");
  notifyWatchers();
}

export function disableDesktopNotifications(): void {
  localStorage.removeItem(DESKTOP_NOTIFICATIONS_STORAGE_KEY);
  notifyWatchers();
}

