import apiClient from "../client";
import { API_CONFIG } from "../config";
import type { UserSearchResponse, UserSuggestion } from "@/lib/types";

export class UserService {
  /**
   * Suggestions while typing a username: accounts whose username or display name contains the text,
   * exact match first. Pass a signal to cancel a request the next keystroke made obsolete.
   */
  static async searchUsers(
    query: string,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<UserSuggestion[]> {
    const response = await apiClient.get<UserSearchResponse>(API_CONFIG.ENDPOINTS.USERS.SEARCH, {
      params: { q: query, limit: options.limit },
      signal: options.signal,
    });
    return response.data.items;
  }
}
