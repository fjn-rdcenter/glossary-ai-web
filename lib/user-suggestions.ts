/**
 * Pure logic behind the username field of the share dialog. No React and no runtime imports.
 *
 * The API flags the result that is exactly what was typed (username or email, any case) as `exact`.
 * An account exists only once its owner has logged in once, so "no exact result" means nobody has used
 * that name yet. That is a warning, not an error: the invitation is kept and delivered at their first login.
 */

import type { UserSuggestion } from "./types";

/** Matches the API: it answers nothing for less. */
export const MIN_USER_QUERY_LENGTH = 2;

export type UsernameNotice =
  /** Nothing to say yet: too short, still searching, or the search failed (not knowing is not a warning). */
  | { kind: "none" }
  | { kind: "known"; user: UserSuggestion }
  /** The account exists but already has access or an open invitation. */
  | { kind: "blocked"; user: UserSuggestion }
  | { kind: "unknown"; name: string };

/** The account the typed text names, preferring the one whose username matches exactly (same case). */
export function findExactUser(typed: string, items: UserSuggestion[]): UserSuggestion | null {
  const exact = items.filter((item) => item.exact);
  if (exact.length === 0) return null;
  const text = typed.trim();
  return exact.find((item) => item.username === text) ?? exact[0];
}

export function describeUsernameInput(input: {
  typed: string;
  items: UserSuggestion[];
  status: "idle" | "searching" | "done" | "error";
  /** The trimmed text `items` answers. A result for older text says nothing about what is typed now. */
  searchedFor: string | null;
  /** Lower-cased usernames that already have access or an open invitation (the owner included). */
  blocked: ReadonlySet<string>;
}): UsernameNotice {
  const typed = input.typed.trim();
  if (typed.length < MIN_USER_QUERY_LENGTH) return { kind: "none" };
  if (input.status !== "done" || input.searchedFor !== typed) return { kind: "none" };

  const user = findExactUser(typed, input.items);
  if (!user) return { kind: "unknown", name: typed };
  return input.blocked.has(user.username.toLowerCase()) ? { kind: "blocked", user } : { kind: "known", user };
}

/** What to offer in the list: not people who already have access. */
export function selectableSuggestions(items: UserSuggestion[], blocked: ReadonlySet<string>): UserSuggestion[] {
  return items.filter((item) => !blocked.has(item.username.toLowerCase()));
}

/** Arrow-key movement through `count` options, wrapping at both ends. `-1` means nothing is highlighted. */
export function moveHighlight(current: number, count: number, direction: "next" | "previous"): number {
  if (count <= 0) return -1;
  if (direction === "next") return current < 0 || current >= count - 1 ? 0 : current + 1;
  return current <= 0 ? count - 1 : current - 1;
}

/** Fill `{name}` in a message from the copy files. */
export function fillName(template: string, name: string): string {
  return template.replace("{name}", name);
}

/**
 * What a row of people shows: the display name on the first line (the username when there is none) and
 * the username on the second.
 */
export function describePerson(
  username: string,
  displayName: string | null | undefined,
): { primary: string; secondary: string } {
  return { primary: displayName?.trim() || username, secondary: username };
}
