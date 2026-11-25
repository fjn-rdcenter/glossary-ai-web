"use client";

import { useCallback, useReducer, useRef } from "react";
import { GlossaryService, NotificationService } from "@/api";
import { initialNotificationState, invitationTarget, notificationReducer } from "@/lib/notifications";
import type { NotificationResponse } from "@/lib/types";
import { useMountEffect } from "./use-mount-effect";

/** How often the unread count is fetched while the tab is visible. The count is served by an index, so it is cheap. */
export const NOTIFICATION_POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 20;

/**
 * State and actions behind the notification bell.
 *
 * The unread count is polled while the tab is visible, and again when the tab becomes visible or the window
 * regains focus. The list is fetched when the popover opens (`onOpenChange(true)`), and reloaded by a poll that
 * sees the count change while it is open.
 */
export function useNotificationCenter() {
  const [state, dispatch] = useReducer(notificationReducer, initialNotificationState);

  const isOpenRef = useRef(false);
  const unreadRef = useRef(0);
  const countRequestRef = useRef<Promise<number | null> | null>(null);
  // Bumped by every list reload, so a slow response for an old list cannot replace a newer one.
  const listGenerationRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);

  const setCount = useCallback((count: number) => {
    unreadRef.current = count;
    dispatch({ type: "count", count });
  }, []);

  /** Fetch the unread count. One request at a time; resolves to `null` when it fails (the last count stays). */
  const fetchCount = useCallback((): Promise<number | null> => {
    if (countRequestRef.current) return countRequestRef.current;

    const request = NotificationService.getUnreadCount()
      .then((count) => {
        setCount(count);
        return count;
      })
      .catch(() => null) // A failed poll is not worth interrupting anyone; the next one retries.
      .finally(() => {
        countRequestRef.current = null;
      });
    countRequestRef.current = request;
    return request;
  }, [setCount]);

  const reloadList = useCallback(async () => {
    const generation = ++listGenerationRef.current;
    dispatch({ type: "listLoading" });

    try {
      const page = await NotificationService.list({ limit: PAGE_SIZE });
      if (generation !== listGenerationRef.current) return;
      nextCursorRef.current = page.nextCursor;
      dispatch({ type: "listLoaded", items: page.items, nextCursor: page.nextCursor });
    } catch (error) {
      if (generation !== listGenerationRef.current) return;
      console.error("Failed to load notifications", error);
      dispatch({ type: "listFailed" });
    }
  }, []);

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (!cursor || isLoadingMoreRef.current) return;

    const generation = listGenerationRef.current;
    isLoadingMoreRef.current = true;
    dispatch({ type: "moreLoading" });

    try {
      const page = await NotificationService.list({ limit: PAGE_SIZE, cursor });
      if (generation !== listGenerationRef.current) return; // the list was reloaded meanwhile
      nextCursorRef.current = page.nextCursor;
      dispatch({ type: "moreLoaded", items: page.items, nextCursor: page.nextCursor });
    } catch (error) {
      console.error("Failed to load more notifications", error);
      if (generation === listGenerationRef.current) dispatch({ type: "moreFailed" });
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, []);

  /** After a change the server has the last word: fetch both again. */
  const resync = useCallback(() => {
    void fetchCount();
    void reloadList();
  }, [fetchCount, reloadList]);

  /** Call from the popover's `onOpenChange`. Opening loads the list and refreshes the count. */
  const onOpenChange = useCallback(
    (open: boolean) => {
      isOpenRef.current = open;
      if (open) resync();
    },
    [resync],
  );

  useMountEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== "visible") return;

      const before = unreadRef.current;
      const count = await fetchCount();
      // Something new arrived while the list is on screen.
      if (count !== null && count !== before && isOpenRef.current) void reloadList();
    };

    void poll();
    const timer = window.setInterval(() => void poll(), NOTIFICATION_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener("focus", poll);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
      window.removeEventListener("focus", poll);
    };
  });

  const markRead = useCallback(
    async (id: string) => {
      dispatch({ type: "read", id, at: new Date().toISOString() });
      try {
        await NotificationService.markRead(id);
        void fetchCount(); // keeps the polled count in step with what was just shown
      } catch (error) {
        console.error("Failed to mark a notification as read", error);
        resync();
      }
    },
    [fetchCount, resync],
  );

  const markAllRead = useCallback(async () => {
    dispatch({ type: "readAll", at: new Date().toISOString() });
    unreadRef.current = 0;
    try {
      await NotificationService.markAllRead();
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
      resync();
    }
  }, [resync]);

  /**
   * Accept or decline an invitation. Rejects with the API error so the caller can show it; when the invitation
   * can no longer be answered the list is reloaded so its card shows what is true now.
   */
  const answerInvitation = useCallback(
    async (item: NotificationResponse, accept: boolean) => {
      const target = invitationTarget(item);
      if (!target) return;

      try {
        if (accept) await GlossaryService.acceptInvitation(target.glossaryId, target.permissionId);
        else await GlossaryService.declineInvitation(target.glossaryId, target.permissionId);
      } catch (error) {
        void reloadList();
        throw error;
      }

      dispatch({ type: "answered", id: item.id, state: accept ? "accepted" : "declined", at: new Date().toISOString() });
      void fetchCount();
    },
    [fetchCount, reloadList],
  );

  return { state, onOpenChange, reloadList, loadMore, markRead, markAllRead, answerInvitation };
}
