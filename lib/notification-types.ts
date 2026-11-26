/**
 * Notification types shared with the API. The backend's `NotificationType` enum
 * (glossary-ai-backend/app/entities/models.py) is the source of truth; keep this list in sync with it.
 * Every type needs a message under `Notifications.<TYPE>` in messages/{en,vi,ja}.json, which
 * `yarn check:error-codes` enforces. A type this build does not know falls back to a generic message.
 */

import type { ErrorParams } from "./api-error";
import { stringParam, translationFailure } from "./notifications";
import type { NotificationResponse } from "./types";

export const NOTIFICATION_TYPES = [
  "GLOSSARY_SHARED",
  "GLOSSARY_SHARE_ACCEPTED",
  "GLOSSARY_SHARE_DECLINED",
  "GLOSSARY_PERMISSION_CHANGED",
  "TRANSLATION_COMPLETED",
  "TRANSLATION_FAILED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isKnownNotificationType(type: string): type is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/** Translates a key under `Notifications`; next-intl's `useTranslations("Notifications")` fits. */
export type NotificationsTranslator = (key: string, values?: Record<string, string>) => string;

/**
 * What the bell and the desktop notification say about `item`, in the translator's language: its sentence, and for
 * a failed translation, why it failed (`describeFailure` is `useDescribeError().describeFailureReason`).
 */
export function notificationText(
  item: NotificationResponse,
  t: NotificationsTranslator,
  describeFailure: (code: string, params: ErrorParams) => string,
): { message: string; reason: string | null } {
  const message = t(isKnownNotificationType(item.type) ? item.type : "UNKNOWN", {
    actorName: stringParam(item, "actorName") ?? "",
    glossaryName: stringParam(item, "glossaryName") ?? "",
    documentName: stringParam(item, "documentName") ?? t("documentFallback"),
  });
  if (item.type !== "TRANSLATION_FAILED") return { message, reason: null };
  const failure = translationFailure(item);
  return { message, reason: describeFailure(failure.code, failure.params) };
}
