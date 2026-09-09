/**
 * Authentication Service
 * API calls for user authentication
 * 
 * TODO: Implement the actual API calls based on your backend endpoints
 */

import apiClient from "../client";
import { API_CONFIG } from "../config";
import {
  LoginRequest,
  LoginResponse,
  UserResponse,
  UserUpdateRequest,
  RefreshTokenResponse,
  ApiResponse,
} from "@/lib/types";
import { ApiErrorHandler } from "../utils/error-handler";

export class AuthService {
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Prepare form data for OAuth2 password grant
      const formData = new URLSearchParams();
      formData.append("grant_type", credentials.grant_type || "password");
      formData.append("username", credentials.username);
      formData.append("password", credentials.password);
      formData.append("scope", credentials.scope || "");
      formData.append("client_id", credentials.client_id || "string");
      formData.append("client_secret", credentials.client_secret || "");
      
      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        formData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          withCredentials: true, // Important: allows cookies to be set
        }
      );
            
      // Handle different response formats
      const loginData = response.data.data || response.data;
      // In new schema, properties are strictly access_token and refresh_token
      const token = (loginData as any).token || loginData.access_token;
      const refreshToken = (loginData as any).refreshToken || loginData.refresh_token;
      
      // Store access token in localStorage
      if (token) {
        localStorage.setItem("auth_token", token);
      }
      
      // Store refresh token in cookie (if not already set by backend)
      let cookieExists = document.cookie.includes('refresh_token');
      
      // Clear manual logout flag if it exists
      localStorage.removeItem("user_logged_out");
      
      if (refreshToken) {
        // Check if backend already set the cookie
        if (!cookieExists) {
          // Set cookie with secure flags
          document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
          cookieExists = true;
        } else {
          console.log("Refresh token already set by backend");
        }
      }

      // NOTE: We cannot verify the presence of the refresh_token cookie in JavaScript
      // because it is set with the HttpOnly flag for security. 
      // We assume if the API returned 200 OK, the Set-Cookie header was processed by the browser.

      return loginData;
    } catch (error) {
      console.error("Login error details:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      ApiErrorHandler.logError(error, "AuthService.login");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    // 1. Clear client-side state FIRST to ensure user is "logged out" locally
    // regardless of whether the API call succeeds or fails.
    localStorage.removeItem("auth_token");
    localStorage.setItem("user_logged_out", "true");
    
    localStorage.removeItem("onboardingTourCompleted");
    localStorage.removeItem("documentTourCompleted");
    localStorage.removeItem("glossaryTourCompleted");
    localStorage.removeItem("createGlossaryTourCompleted");
    localStorage.removeItem("firstLoginCompleted");
    
    // Clear refresh token cookie (best effort, though HttpOnly cookies won't be cleared by JS)
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {}, {
        withCredentials: true, // Send cookies with request
      });
    } catch (error) {
      // Log error but don't rethrow, so UI can proceed to redirect
      console.warn("Backend logout failed (network or auth error), but client is cleared:", error);
      ApiErrorHandler.logError(error, "AuthService.logout");
    }
  }

  /**
   * Refresh authentication token
   * Refresh token should be in cookie (sent automatically by browser)
   */
  static async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      // Send empty body - refresh token is in cookie
      const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
        API_CONFIG.ENDPOINTS.AUTH.REFRESH,
        {},
        {
          withCredentials: true, // Important: sends cookies with request
        }
      );
      
      // Handle different response formats
      const tokenData = response.data.data || response.data;
      // Use type assertion for backward compatibility if needed, or strictly use new schema
      const newAccessToken = (tokenData as any).token || tokenData.access_token;
      const newRefreshToken = (tokenData as any).refreshToken || tokenData.refresh_token;
      
      // Update access token in localStorage
      if (newAccessToken) {
        localStorage.setItem("auth_token", newAccessToken);
      }
      
      // Update refresh token in cookie if provided
      if (newRefreshToken) {
        document.cookie = `refresh_token=${newRefreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
      }
      
      return tokenData;
    } catch (error) {
      ApiErrorHandler.logError(error, "AuthService.refreshToken");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<UserResponse> {
    try {
      const response = await apiClient.get<UserResponse>(
        API_CONFIG.ENDPOINTS.AUTH.ME
      );
      
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "AuthService.getCurrentUser");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }

  /**
   * Update user profile with walkthrough status
   */
  static async updateUserProfile(updates: UserUpdateRequest): Promise<UserResponse> {
    try {
      const response = await apiClient.patch<UserResponse>(
        API_CONFIG.ENDPOINTS.AUTH.UPDATE_ME, updates, { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      ApiErrorHandler.logError(error, "AuthService.updateUserProfile");
      throw new Error(ApiErrorHandler.parseError(error));
    }
  }
}
