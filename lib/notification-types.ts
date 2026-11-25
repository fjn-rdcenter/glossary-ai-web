/**
 * Notification types shared with the API. The backend's `NotificationType` enum
 * (glossary-ai-backend/app/entities/models.py) is the source of truth; keep this list in sync with it.
 * Every type needs a message under `Notifications.<TYPE>` in messages/{en,vi,ja}.json, which
 * `yarn check:error-codes` enforces. A type this build does not know falls back to a generic message.
 */

export const NOTIFICATION_TYPES = [
  "GLOSSARY_SHARED",
  "GLOSSARY_SHARE_ACCEPTED",
  "GLOSSARY_SHARE_DECLINED",
  "GLOSSARY_PERMISSION_CHANGED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isKnownNotificationType(type: string): type is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type);
}
