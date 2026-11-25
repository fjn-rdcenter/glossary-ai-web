/**
 * Pure helpers for the notification list. No React and no runtime imports, so they can be exercised on their own.
 */

import type { NotificationResponse } from "./types";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const RELATIVE_LIMIT_DAYS = 7;

/** "now", "5 minutes ago", "yesterday" in the user's language; an absolute date after a week. */
export function formatRelativeTime(iso: string, locale: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((then - now) / 1000); // negative: in the past
  const age = Math.abs(seconds);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (age < MINUTE) return relative.format(0, "second");
  if (age < HOUR) return relative.format(Math.trunc(seconds / MINUTE), "minute");
  if (age < DAY) return relative.format(Math.trunc(seconds / HOUR), "hour");
  if (age < RELATIVE_LIMIT_DAYS * DAY) return relative.format(Math.trunc(seconds / DAY), "day");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(then);
}

/** The badge text for an unread count: nothing for zero, "99+" past two digits. */
export function formatBadgeCount(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

/** Append a page, skipping anything already shown (a refresh and a "load more" can overlap). */
export function mergeNotificationPage(
  current: NotificationResponse[],
  page: NotificationResponse[],
): NotificationResponse[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...page.filter((item) => !seen.has(item.id))];
}

export function markItemRead(items: NotificationResponse[], id: string, readAt: string): NotificationResponse[] {
  return items.map((item) => (item.id === id && item.readAt === null ? { ...item, readAt } : item));
}

export function markAllItemsRead(items: NotificationResponse[], readAt: string): NotificationResponse[] {
  return items.map((item) => (item.readAt === null ? { ...item, readAt } : item));
}

/** What the list shows right after the user answers an invitation; the server marks it read as well. */
export function applyInvitationAnswer(
  items: NotificationResponse[],
  id: string,
  state: "accepted" | "declined",
  readAt: string,
): NotificationResponse[] {
  return items.map((item) =>
    item.id === id ? { ...item, actionState: state, readAt: item.readAt ?? readAt } : item,
  );
}

export function countUnread(items: NotificationResponse[]): number {
  return items.filter((item) => item.readAt === null).length;
}

function stringParam(item: NotificationResponse, key: string): string | null {
  const value = item.params[key];
  return typeof value === "string" && value !== "" ? value : null;
}

/** The glossary and permission an invitation can be answered on, or `null` once it can no longer be. */
export function invitationTarget(item: NotificationResponse): { glossaryId: string; permissionId: string } | null {
  if (item.type !== "GLOSSARY_SHARED" || item.actionState !== "pending") return null;
  const glossaryId = stringParam(item, "glossaryId");
  if (!glossaryId || !item.subjectId) return null;
  return { glossaryId, permissionId: item.subjectId };
}

/** The glossary a notification is about, when the user can still open it. */
export function glossaryPath(item: NotificationResponse): string | null {
  const glossaryId = stringParam(item, "glossaryId");
  if (!glossaryId) return null;

  switch (item.type) {
    case "GLOSSARY_SHARED":
      // An open, declined, expired or withdrawn invitation gives no access.
      return item.actionState === "accepted" ? `/dashboard/glossaries/${glossaryId}` : null;
    case "GLOSSARY_SHARE_ACCEPTED":
    case "GLOSSARY_SHARE_DECLINED":
    case "GLOSSARY_PERMISSION_CHANGED":
      return `/dashboard/glossaries/${glossaryId}`;
    default:
      return null;
  }
}

// --- State of the notification center ---

export interface NotificationState {
  /** Server-wide count, adjusted locally after the user's own actions until the next fetch corrects it. */
  unreadCount: number;
  items: NotificationResponse[];
  nextCursor: string | null;
  status: "idle" | "loading" | "ready" | "error";
  isLoadingMore: boolean;
}

export type NotificationAction =
  | { type: "count"; count: number }
  | { type: "listLoading" }
  | { type: "listLoaded"; items: NotificationResponse[]; nextCursor: string | null }
  | { type: "listFailed" }
  | { type: "moreLoading" }
  | { type: "moreLoaded"; items: NotificationResponse[]; nextCursor: string | null }
  | { type: "moreFailed" }
  | { type: "read"; id: string; at: string }
  | { type: "readAll"; at: string }
  | { type: "answered"; id: string; state: "accepted" | "declined"; at: string };

export const initialNotificationState: NotificationState = {
  unreadCount: 0,
  items: [],
  nextCursor: null,
  status: "idle",
  isLoadingMore: false,
};

function wasUnread(items: NotificationResponse[], id: string): boolean {
  return items.some((item) => item.id === id && item.readAt === null);
}

export function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case "count":
      return { ...state, unreadCount: Math.max(0, action.count) };
    case "listLoading":
      // A refresh of a list that is already showing keeps showing it.
      return state.items.length > 0 ? state : { ...state, status: "loading" };
    case "listLoaded":
      return { ...state, items: action.items, nextCursor: action.nextCursor, status: "ready", isLoadingMore: false };
    case "listFailed":
      return { ...state, status: "error" };
    case "moreLoading":
      return { ...state, isLoadingMore: true };
    case "moreLoaded":
      return {
        ...state,
        items: mergeNotificationPage(state.items, action.items),
        nextCursor: action.nextCursor,
        isLoadingMore: false,
      };
    case "moreFailed":
      return { ...state, isLoadingMore: false };
    case "read":
      return {
        ...state,
        items: markItemRead(state.items, action.id, action.at),
        unreadCount: wasUnread(state.items, action.id) ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    case "readAll":
      return { ...state, items: markAllItemsRead(state.items, action.at), unreadCount: 0 };
    case "answered":
      return {
        ...state,
        items: applyInvitationAnswer(state.items, action.id, action.state, action.at),
        unreadCount: wasUnread(state.items, action.id) ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
  }
}
