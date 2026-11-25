/**
 * Error codes shared with the API. The backend's `ErrorCode` enum
 * (glossary-ai-backend/app/helpers/exceptions.py) is the source of truth; keep this list in sync
 * with it. Every code needs a message under `Errors.<CODE>` in messages/{en,vi,ja}.json, which
 * `yarn check:error-codes` enforces. See glossary-ai-backend/docs/adr/error-code-contract.md.
 */

export const SERVER_ERROR_CODES = [
  // Generic fallbacks, one per status.
  "BAD_REQUEST",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
  // Authentication and users.
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_DIRECTORY_UNAVAILABLE",
  "AUTH_TOKEN_INVALID",
  "AUTH_SESSION_EXPIRED",
  "USER_NOT_FOUND",
  // Glossaries, terms and sharing.
  "GLOSSARY_NOT_FOUND",
  "GLOSSARY_NAME_CONFLICT",
  "GLOSSARY_ACCESS_DENIED",
  "GLOSSARY_TERM_NOT_FOUND",
  "GLOSSARY_TERM_CONFLICT",
  "PERMISSION_NOT_FOUND",
  "PERMISSION_ALREADY_EXISTS",
  "PERMISSION_ADMIN_GRANT_FORBIDDEN",
  "PERMISSION_PUBLIC_ADMIN_NOT_ALLOWED",
  // Documents and translation.
  "DOCUMENT_NOT_FOUND",
  "UNSUPPORTED_FILE_TYPE",
  "TRANSLATION_JOB_NOT_FOUND",
  "TRANSLATION_TABLE_NOT_FOUND",
  "TRANSLATION_QUOTA_EXCEEDED",
  "TRANSLATION_INVALID_STATE",
  // Failure reasons of a failed translation job.
  "TRANSLATION_FAILED",
  "TRANSLATION_TIMEOUT",
  "LLM_UNAVAILABLE",
  "OCR_UNAVAILABLE",
  "DOCUMENT_UNREADABLE",
] as const;

/** Codes the client creates for failures that never produced the API's error envelope. */
export const CLIENT_ERROR_CODES = ["NETWORK_ERROR", "TIMEOUT", "UNKNOWN_ERROR"] as const;

export const ERROR_CODES = [...SERVER_ERROR_CODES, ...CLIENT_ERROR_CODES] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Why a single field failed validation (`error.fields[].code`). */
export const FIELD_ERROR_CODES = [
  "REQUIRED",
  "INVALID_TYPE",
  "INVALID_FORMAT",
  "TOO_SHORT",
  "TOO_LONG",
  "OUT_OF_RANGE",
  "INVALID_CHOICE",
  "INVALID_VALUE",
] as const;

export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

const KNOWN_CODES = new Set<string>(ERROR_CODES);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && KNOWN_CODES.has(value);
}

const STATUS_FALLBACK_CODES: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "AUTH_SESSION_EXPIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
  502: "SERVICE_UNAVAILABLE",
  503: "SERVICE_UNAVAILABLE",
  504: "SERVICE_UNAVAILABLE",
};

/** The generic code whose message is shown when a code is unknown to this build of the frontend. */
export function fallbackCodeForStatus(status: number): ErrorCode {
  if (STATUS_FALLBACK_CODES[status]) return STATUS_FALLBACK_CODES[status];
  if (status >= 500) return "INTERNAL_ERROR";
  if (status >= 400) return "BAD_REQUEST";
  return "UNKNOWN_ERROR";
}
