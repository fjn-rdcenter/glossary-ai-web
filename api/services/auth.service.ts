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
import { clearAuthSession, clearLegacyRefreshCookie, storeAccessToken } from "../auth-session";
import { API_CONFIG } from "../config";
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  UserResponse,
  UserUpdateRequest,
} from "@/lib/types";
import { ApiErrorHandler } from "../utils/error-handler";

type AuthResponse<T> = T | ApiResponse<T>;

function unwrapAuthResponse<T extends object>(response: AuthResponse<T>): T {
  return "data" in response ? response.data : response;
}

export class AuthService {
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      clearLegacyRefreshCookie();

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
    } catch (error) {
      ApiErrorHandler.logError(error, "AuthService.login");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  static async logout(): Promise<void> {
    clearAuthSession();
    clearDefaultAuthorization();

    try {
      await authClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {});
    } catch (error) {
      ApiErrorHandler.logError(error, "AuthService.logout");
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
    try {
      const response = await apiClient.get<UserResponse>(API_CONFIG.ENDPOINTS.AUTH.ME);
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "AuthService.getCurrentUser");
      throw error;
    }
  }

  static async updateUserProfile(updates: UserUpdateRequest): Promise<UserResponse> {
    try {
      const response = await apiClient.patch<UserResponse>(
        API_CONFIG.ENDPOINTS.AUTH.UPDATE_ME,
        updates,
      );
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "AuthService.updateUserProfile");
      throw error;
    }
  }
}
