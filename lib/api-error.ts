/**
 * The one error type API calls reject with. Every failure (the API's error envelope, an nginx
 * HTML page, a network drop, a timeout) is normalized here, so screens only deal with `code`.
 * See glossary-ai-backend/docs/adr/error-code-contract.md.
 */

import axios from "axios";
import { fallbackCodeForStatus, type ErrorCode } from "@/lib/error-codes";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

export type ErrorParams = Record<string, string | number | boolean | null>;

export interface ApiFieldError {
  field: string;
  code: string;
  params: ErrorParams;
}

export interface ApiErrorInit {
  status: number;
  /** A known `ErrorCode`, or a newer code from the API that this build does not know yet. */
  code: ErrorCode | (string & {});
  /** English, for developers and the console only. Never shown to users. */
  message: string;
  params?: ErrorParams;
  fields?: ApiFieldError[];
  requestId?: string | null;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | (string & {});
  readonly params: ErrorParams;
  readonly fields: ApiFieldError[];
  readonly requestId: string | null;

  constructor(init: ApiErrorInit) {
    super(init.message, { cause: init.cause });
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.params = init.params ?? {};
    this.fields = init.fields ?? [];
    this.requestId = init.requestId ?? null;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** A request the app cancelled on purpose (unmount, superseded search). Not an error to show. */
export function isAbortError(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  return error instanceof DOMException && error.name === "AbortError";
}

interface ErrorEnvelope {
  error: {
    code: string;
    message?: string;
    params?: ErrorParams;
    fields?: ApiFieldError[];
    request_id?: string | null;
  };
}

function isErrorEnvelope(data: unknown): data is ErrorEnvelope {
  if (!data || typeof data !== "object") return false;
  const error = (data as { error?: unknown }).error;
  return !!error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string";
}

function headerValue(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== "object") return null;
  const getter = (headers as { get?: (key: string) => unknown }).get;
  const value =
    typeof getter === "function"
      ? getter.call(headers, name)
      : (headers as Record<string, unknown>)[name] ?? (headers as Record<string, unknown>)[name.toLowerCase()];
  return typeof value === "string" && value ? value : null;
}

/**
 * Turn anything an API call can throw into an `ApiError`.
 *
 * `responseData` overrides `error.response.data`; the client passes it after decoding a JSON
 * error body that arrived as a Blob (download requests).
 */
export function toApiError(error: unknown, responseData?: unknown): ApiError {
  if (isApiError(error)) return error;

  if (axios.isAxiosError(error)) {
    const sentRequestId = headerValue(error.config?.headers, REQUEST_ID_HEADER);
    const response = error.response;

    if (!response) {
      const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      return new ApiError({
        status: 0,
        code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
        message: error.message,
        requestId: sentRequestId,
        cause: error,
      });
    }

    const status = response.status;
    const data = responseData ?? response.data;
    const requestId = headerValue(response.headers, REQUEST_ID_HEADER) ?? sentRequestId;

    if (isErrorEnvelope(data)) {
      return new ApiError({
        status,
        code: data.error.code,
        message: data.error.message ?? `HTTP ${status}`,
        params: data.error.params,
        fields: data.error.fields,
        requestId: data.error.request_id ?? requestId,
        cause: error,
      });
    }

    // Not the API's envelope: a proxy page (nginx 413/502/504) or an unexpected body.
    const code: ErrorCode =
      status === 413 || status === 502 || status === 503 || status === 504
        ? fallbackCodeForStatus(status)
        : "UNKNOWN_ERROR";
    return new ApiError({ status, code, message: `HTTP ${status} without an error envelope`, requestId, cause: error });
  }

  return new ApiError({
    status: 0,
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

/** Decode a JSON error body that axios delivered as a Blob (requests made with responseType "blob"). */
export async function readBlobErrorBody(data: unknown): Promise<unknown> {
  if (typeof Blob === "undefined" || !(data instanceof Blob)) return undefined;
  if (!data.type.includes("json")) return undefined;
  try {
    return JSON.parse(await data.text());
  } catch {
    return undefined;
  }
}
