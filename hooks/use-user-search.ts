"use client";

import { useCallback, useRef, useState } from "react";
import { UserService } from "@/api";
import { isAbortError } from "@/lib/api-error";
import { findExactUser, MIN_USER_QUERY_LENGTH } from "@/lib/user-suggestions";
import type { UserSuggestion } from "@/lib/types";
import { useMountEffect } from "./use-mount-effect";

export type UserSearchStatus = "idle" | "searching" | "done" | "error";

interface UserSearchState {
  items: UserSuggestion[];
  status: UserSearchStatus;
  /** The trimmed text `items` answers. */
  searchedFor: string | null;
}

const IDLE: UserSearchState = { items: [], status: "idle", searchedFor: null };

/** What `resolve` found out about a typed name. `unavailable` means the search failed, which says nothing about it. */
export type UserResolution =
  | { status: "found"; user: UserSuggestion }
  | { status: "unknown" }
  | { status: "unavailable" };

/**
 * Username suggestions while typing. Call `search(text)` on every change: it waits for a pause in typing,
 * cancels the request the next keystroke made obsolete, and ignores a late answer for old text.
 * Pass `enabled: false` where no real account lookup applies (the guided tour's sample glossary).
 */
export function useUserSearch({ enabled = true, delayMs = 250, limit = 10 } = {}) {
  const [state, setState] = useState<UserSearchState>(IDLE);

  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped by every search and by `reset`, so only the latest request may write its answer.
  const requestRef = useRef(0);
  // The last answer received, for `resolve` to reuse when it is still about the text being submitted.
  const lastAnswerRef = useRef<{ query: string; items: UserSuggestion[] } | null>(null);

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    requestRef.current += 1;
  }, []);

  const run = useCallback(
    async (query: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const request = ++requestRef.current;
      setState((current) => ({ ...current, status: "searching" }));

      try {
        const items = await UserService.searchUsers(query, { limit, signal: controller.signal });
        if (request !== requestRef.current) return;
        lastAnswerRef.current = { query, items };
        setState({ items, status: "done", searchedFor: query });
      } catch (error) {
        if (isAbortError(error) || request !== requestRef.current) return;
        console.error("Failed to search users", error);
        setState({ items: [], status: "error", searchedFor: null });
      }
    },
    [limit],
  );

  const search = useCallback(
    (text: string) => {
      cancelPending();
      const query = text.trim();
      if (!enabled || query.length < MIN_USER_QUERY_LENGTH) {
        setState(IDLE);
        return;
      }
      timerRef.current = window.setTimeout(() => void run(query), delayMs);
    },
    [cancelPending, delayMs, enabled, run],
  );

  const reset = useCallback(() => {
    cancelPending();
    lastAnswerRef.current = null;
    setState(IDLE);
  }, [cancelPending]);

  /**
   * Settle what a typed name refers to, for the moment it is submitted: the last answer if it is about this
   * text, otherwise a fresh lookup. Never throws; a failed lookup is `unavailable`.
   */
  const resolve = useCallback(
    async (text: string): Promise<UserResolution> => {
      const query = text.trim();
      if (!enabled || query.length < MIN_USER_QUERY_LENGTH) return { status: "unavailable" };

      let items: UserSuggestion[];
      if (lastAnswerRef.current?.query === query) {
        items = lastAnswerRef.current.items;
      } else {
        try {
          items = await UserService.searchUsers(query, { limit });
        } catch (error) {
          console.error("Failed to look up a user", error);
          return { status: "unavailable" };
        }
      }

      const user = findExactUser(query, items);
      return user ? { status: "found", user } : { status: "unknown" };
    },
    [enabled, limit],
  );

  useMountEffect(() => cancelPending);

  return { ...state, search, reset, resolve };
}
