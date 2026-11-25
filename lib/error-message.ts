/**
 * Turns an error into what a screen shows: an action context (the screen's own text, e.g.
 * "Could not save the glossary"), a reason looked up from `Errors.<CODE>`, and, for failures the
 * user cannot fix themselves, the request ID to report.
 */

import { isApiError, toApiError, type ApiError, type ErrorParams } from "@/lib/api-error";
import { fallbackCodeForStatus } from "@/lib/error-codes";

export interface UiError {
  /** The action context, or the reason itself when no context was given. */
  title: string;
  reason?: string;
  /** Set only for 5xx, network and unknown failures. */
  requestId?: string;
}

/** The subset of next-intl's `t` (scoped to the `Errors` namespace) used here. */
export interface ErrorTranslator {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
}

/** A message that is not about an API call (e.g. a client-side validation message). */
export function uiError(title: string): UiError {
  return { title };
}

function messageValues(params: ErrorParams): Record<string, string | number> {
  const values: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number") values[key] = value;
  }
  return values;
}

function resolveCode(t: ErrorTranslator, code: string, status: number): string {
  if (t.has(code)) return code;
  const fallback = status === 0 ? "UNKNOWN_ERROR" : fallbackCodeForStatus(status);
  return t.has(fallback) ? fallback : "UNKNOWN_ERROR";
}

/** Labels are keyed by the last named segment: `terms.3.source` uses `fieldNames.source`. */
function fieldLabel(t: ErrorTranslator, field: string): string {
  const name = field.split(".").filter((part) => part && !/^\d+$/.test(part)).pop();
  const key = `fieldNames.${name}`;
  return name && t.has(key) ? t(key) : field;
}

function validationReason(t: ErrorTranslator, error: ApiError): string {
  const [first] = error.fields;
  if (!first) return t("VALIDATION_FAILED");
  const fieldKey = `fields.${first.code}`;
  const reason = t.has(fieldKey) ? t(fieldKey, messageValues(first.params)) : t("fields.INVALID_VALUE");
  return t("VALIDATION_FAILED_FIELD", { field: fieldLabel(t, first.field), reason });
}

/** The reason for an error code, e.g. a failed job's `errorCode` with its `errorParams`. */
export function describeCode(
  t: ErrorTranslator,
  code: string | null | undefined,
  params: ErrorParams | null | undefined = {},
  status = 0,
): string {
  return t(resolveCode(t, code ?? "UNKNOWN_ERROR", status), messageValues(params ?? {}));
}

function shouldShowReference(error: ApiError): boolean {
  return error.status === 0 || error.status >= 500 || error.code === "UNKNOWN_ERROR";
}

export function describeError(t: ErrorTranslator, error: unknown, title?: string): UiError {
  const apiError = isApiError(error) ? error : toApiError(error);
  const code = resolveCode(t, apiError.code, apiError.status);
  const reason =
    code === "VALIDATION_FAILED" ? validationReason(t, apiError) : t(code, messageValues(apiError.params));
  const requestId = shouldShowReference(apiError) ? apiError.requestId ?? undefined : undefined;

  return title ? { title, reason, requestId } : { title: reason, requestId };
}
