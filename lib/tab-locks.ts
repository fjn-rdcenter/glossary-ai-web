/**
 * Coordination between this app's tabs through the Web Locks API.
 *
 * Lock names are shared by the whole origin, and production shares its origin with other products, so every name
 * carries the `glossaryai_` prefix, like storage keys (docs/adr/glossaryai-browser-storage-namespace.md).
 * The browser releases a tab's locks when the tab closes or crashes. Without Web Locks (no supported Chrome or Edge
 * lacks them), every tab acts as if it were alone.
 */

/** Held by the tab that is refreshing the session, so tabs never send the same refresh cookie twice. */
export const TOKEN_REFRESH_LOCK = "glossaryai_token_refresh";
/** Held by the one tab that announces notifications on the desktop. */
export const DESKTOP_NOTIFIER_LOCK = "glossaryai_desktop_notifier";
/** Held, shared, by every tab the user is looking at (visible and focused). */
export const LOOKING_LOCK = "glossaryai_looking";

function lockManager(): LockManager | null {
  return typeof navigator !== "undefined" && navigator.locks ? navigator.locks : null;
}

/** Run `task` while holding the exclusive lock `name`: no other tab runs a task under that name meanwhile. */
export async function withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  const locks = lockManager();
  return locks ? await locks.request(name, task) : task();
}

/**
 * Hold the lock `name` from the moment it is granted until the returned function is called. `hold` runs once the
 * lock is granted, and the cleanup it returns runs on release. In exclusive mode this elects one tab; in shared mode
 * it marks this tab for `isLockHeld`.
 */
export function holdLock(name: string, mode: LockMode, hold?: () => (() => void) | void): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const granted = () => new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const cleanup = hold?.();
    signal.addEventListener("abort", () => {
      cleanup?.();
      resolve();
    }, { once: true });
  });

  const locks = lockManager();
  if (locks) locks.request(name, { mode, signal }, granted).catch(() => undefined); // aborted before it was granted
  else void granted();
  return () => controller.abort();
}

/** Whether any tab, this one included, holds the lock `name`. */
export async function isLockHeld(name: string): Promise<boolean> {
  const locks = lockManager();
  if (!locks) return false;
  const { held = [] } = await locks.query();
  return held.some((lock) => lock.name === name);
}
