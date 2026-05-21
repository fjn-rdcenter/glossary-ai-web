import apiClient from "../client";
import { API_CONFIG } from "../config";

export interface ReleaseNote {
  version: string;
  date: string;
  changes: string[];
  url?: string;
}

export interface ReleaseNotesResponse {
  releases: ReleaseNote[];
  latest_read_release: string;
}

class ReleaseNotesService {
  /**
   * Fetch release notes from the backend and get the user's latest read release.
   */
  async getReleaseNotes(): Promise<ReleaseNotesResponse> {
    const response = await apiClient.get<ReleaseNotesResponse>(API_CONFIG.ENDPOINTS.RELEASE_NOTES.BASE);
    return response.data;
  }

  /**
   * Mark a specific release version as read.
   */
  async markAsRead(version: string): Promise<{ success: boolean; latest_read_release: string }> {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.RELEASE_NOTES.MARK_READ, { version });
    return response.data;
  }
}

export const releaseNotesService = new ReleaseNotesService();
