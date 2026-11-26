"use client";

import { useSyncExternalStore } from "react";
import {
  type DesktopNotificationState,
  getDesktopNotificationState,
  watchDesktopNotificationState,
} from "@/lib/desktop-notifications";

/** Whether desktop notifications are on in this browser; `unsupported` while rendering on the server. */
export function useDesktopNotificationState(): DesktopNotificationState {
  return useSyncExternalStore(watchDesktopNotificationState, getDesktopNotificationState, () => "unsupported");
}
