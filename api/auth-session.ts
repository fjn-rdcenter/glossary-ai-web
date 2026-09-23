export const ACCESS_TOKEN_STORAGE_KEY = "auth_token";
export const USERNAME_STORAGE_KEY = "glossaryai_username";
export const USER_INFO_STORAGE_KEY = "glossaryai_user_info";

const USER_STORAGE_KEYS = [
  ACCESS_TOKEN_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
  "onboardingTourCompleted",
  "documentTourCompleted",
  "glossaryTourCompleted",
  "createGlossaryTourCompleted",
  "firstLoginCompleted",
];

export function clearLegacyRefreshCookie(): void {
  if (typeof document === "undefined") return;

  // Versions before cookie-based refresh wrote this non-HttpOnly cookie at /.
  document.cookie = "refresh_token=; Max-Age=0; Path=/; SameSite=Lax";
}

export function storeAccessToken(accessToken: string): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  localStorage.removeItem("user_logged_out");
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  USER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem("user_logged_out", "true");
  clearLegacyRefreshCookie();
}
