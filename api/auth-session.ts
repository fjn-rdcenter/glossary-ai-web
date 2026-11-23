import {
  ACCESS_TOKEN_STORAGE_KEY,
  LOGGED_OUT_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
} from "@/lib/storage-keys";

const USER_STORAGE_KEYS = [
  ACCESS_TOKEN_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
];

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function isLoggedOut(): boolean {
  if (typeof window === "undefined") return false;

  return localStorage.getItem(LOGGED_OUT_STORAGE_KEY) === "true";
}

export function storeAccessToken(accessToken: string): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  localStorage.removeItem(LOGGED_OUT_STORAGE_KEY);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  USER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(LOGGED_OUT_STORAGE_KEY, "true");
}
