/**
 * Authenticated API client with a single refresh-and-retry flow for expired
 * access tokens. Refresh tokens remain HttpOnly cookies managed by the API.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { authClient } from "./auth-client";
import { ACCESS_TOKEN_STORAGE_KEY, clearAuthSession, storeAccessToken } from "./auth-session";
import { API_CONFIG } from "./config";
import { AppError } from "@/lib/error-utils";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _accessToken?: string | null;
};

type TokenResponse = {
  access_token?: string;
  data?: {
    access_token?: string;
  };
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;
let forcedLogout: Promise<void> | null = null;

function getAppError(error: AxiosError): AppError {
  const data = error.response?.data as {
    detail?: string | { message?: string };
    message?: string;
    error?: { code?: string };
    code?: string;
  } | undefined;
  const detailMessage = typeof data?.detail === "string" ? data.detail : data?.detail?.message;

  return new AppError(
    detailMessage || data?.message || "An unexpected error occurred",
    error.response?.status ?? (error.request ? 0 : 0),
    data?.error?.code || data?.code || (error.request ? "NETWORK_ERROR" : "UNKNOWN_ERROR"),
    data?.detail ?? null,
    error,
  );
}

function isAuthEndpoint(url?: string): boolean {
  return [
    API_CONFIG.ENDPOINTS.AUTH.LOGIN,
    API_CONFIG.ENDPOINTS.AUTH.REFRESH,
    API_CONFIG.ENDPOINTS.AUTH.LOGOUT,
  ].some((endpoint) => url?.includes(endpoint));
}

function getLoginUrl(): string {
  const currentPath = window.location.pathname;
  const locale = currentPath.match(/\/(en|vi|ja)(?:\/|$)/)?.[1] ?? "vi";
  return `${process.env.NEXT_PUBLIC_BASE_PATH}/${locale}/login/`;
}

function clearDefaultAuthorization(): void {
  delete apiClient.defaults.headers.common.Authorization;
}

function resetForcedLogout(): void {
  forcedLogout = null;
}

async function forceLogout(): Promise<void> {
  if (forcedLogout) return forcedLogout;

  forcedLogout = (async () => {
    clearAuthSession();
    clearDefaultAuthorization();

    try {
      // The API owns the HttpOnly refresh cookie and clears it on logout.
      await authClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {});
    } catch {
      // Local state must still be cleared when the refresh cookie is invalid.
    }

    if (typeof window !== "undefined" && !/\/login\/?$/.test(window.location.pathname)) {
      window.location.replace(getLoginUrl());
    }
  })();

  return forcedLogout;
}

async function refreshAccessToken(): Promise<string> {
  const response = await authClient.post<TokenResponse>(API_CONFIG.ENDPOINTS.AUTH.REFRESH, {});
  const accessToken = response.data.data?.access_token ?? response.data.access_token;

  if (!accessToken) {
    throw new Error("Refresh response did not include an access token");
  }

  storeAccessToken(accessToken);
  return accessToken;
}

function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window === "undefined" || !config.headers) return config;

    const request = config as RetriableRequestConfig;
    const accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    request._accessToken = accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const isUnauthorized = error.response?.status === 401;

    if (!isUnauthorized || !originalRequest || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(getAppError(error));
    }

    if (typeof window !== "undefined" && localStorage.getItem("user_logged_out") === "true") {
      return Promise.reject(getAppError(error));
    }

    const currentAccessToken = typeof window === "undefined"
      ? null
      : localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

    // A sibling request may have already refreshed while this stale 401 was in flight.
    if (!originalRequest._retry && currentAccessToken && currentAccessToken !== originalRequest._accessToken) {
      originalRequest._retry = true;
      originalRequest.headers.Authorization = `Bearer ${currentAccessToken}`;
      return apiClient(originalRequest);
    }

    if (originalRequest._retry) {
      await forceLogout();
      return Promise.reject(getAppError(error));
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessTokenOnce();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      await forceLogout();
      return Promise.reject(refreshError);
    }
  },
);

export { clearDefaultAuthorization, forceLogout, refreshAccessToken, resetForcedLogout };
export default apiClient;
