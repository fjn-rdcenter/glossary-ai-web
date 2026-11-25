import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { readBlobErrorBody, toApiError } from "@/lib/api-error";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";
import { API_CONFIG } from "./config";

/** Give every request its own ID; a retried request keeps the ID it was first sent with. */
export function setRequestId(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (config.headers && !config.headers.get(REQUEST_ID_HEADER)) {
    config.headers.set(REQUEST_ID_HEADER, createRequestId());
  }
  return config;
}

/** Reject with an `ApiError`. Cancelled requests are passed through so callers can ignore them. */
export async function rejectAsApiError(error: unknown): Promise<never> {
  if (axios.isCancel(error)) throw error;
  const blobBody = error instanceof AxiosError ? await readBlobErrorBody(error.response?.data) : undefined;
  throw toApiError(error, blobBody);
}

export const authClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

authClient.interceptors.request.use(setRequestId);
authClient.interceptors.response.use((response) => response, rejectAsApiError);
