/**
 * Authentication API calls. The refresh token is an HttpOnly API cookie and
 * is never read, stored, or cleared directly by browser JavaScript.
 */

import apiClient, {
  clearDefaultAuthorization,
  forceLogout,
  refreshAccessToken,
  resetForcedLogout,
} from "../client";
import { authClient } from "../auth-client";
import { clearAuthSession, storeAccessToken } from "../auth-session";
import { API_CONFIG } from "../config";
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  UserResponse,
  UserUpdateRequest,
} from "@/lib/types";

type AuthResponse<T> = T | ApiResponse<T>;

function unwrapAuthResponse<T extends object>(response: AuthResponse<T>): T {
  return "data" in response ? response.data : response;
}

export class AuthService {
  /** Rejects with an `ApiError`, e.g. `AUTH_INVALID_CREDENTIALS` or `AUTH_DIRECTORY_UNAVAILABLE`. */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await authClient.post<AuthResponse<LoginResponse>>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      formData.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const loginData = unwrapAuthResponse(response.data);

    if (!loginData.access_token) {
      throw new Error("Login response did not include an access token");
    }

    storeAccessToken(loginData.access_token);
    resetForcedLogout();
    return loginData;
  }

  static async logout(): Promise<void> {
    clearAuthSession();
    clearDefaultAuthorization();

    try {
      await authClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {});
    } catch (error) {
      // Local state is already cleared; an expired refresh cookie makes this call fail harmlessly.
      console.warn("Logout request failed", error);
    }
  }

  static async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const accessToken = await refreshAccessToken();
      return { access_token: accessToken, token_type: "bearer" };
    } catch (error) {
      await forceLogout();
      throw error;
    }
  }

  static async getCurrentUser(): Promise<UserResponse> {
    const response = await apiClient.get<UserResponse>(API_CONFIG.ENDPOINTS.AUTH.ME);
    return response.data;
  }

  static async updateUserProfile(updates: UserUpdateRequest): Promise<UserResponse> {
    const response = await apiClient.patch<UserResponse>(
      API_CONFIG.ENDPOINTS.AUTH.UPDATE_ME,
      updates,
    );
    return response.data;
  }
}
