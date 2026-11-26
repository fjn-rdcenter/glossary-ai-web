"use client";

import { useSyncExternalStore } from "react";
import { type EventStreamListener, isEventStreamConnected, subscribeToEvents, watchEventStreamConnection } from "@/api";
import { useLatest } from "./use-latest";
import { useMountEffect } from "./use-mount-effect";

/** Listen to the tab's push stream while this component is mounted. The listener may change between renders. */
export function useEventStream(listener: EventStreamListener) {
  const latest = useLatest(listener);

  useMountEffect(() =>
    subscribeToEvents({
      onReady: () => latest.current.onReady?.(),
      onNotification: () => latest.current.onNotification?.(),
      onJob: (event) => latest.current.onJob?.(event),
    }),
  );
}

/** Whether the push stream is up. While it is not, screens that follow jobs poll instead. */
export function useEventStreamConnected(): boolean {
  return useSyncExternalStore(watchEventStreamConnection, isEventStreamConnected, () => false);
}
