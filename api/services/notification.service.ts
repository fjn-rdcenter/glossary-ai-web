import apiClient from "../client";
import { API_CONFIG } from "../config";
import type { NotificationListResponse } from "@/lib/types";

export class NotificationService {
  /**
   * One page of the user's notifications, newest first. Pass the previous page's `nextCursor` for the next one.
   */
  static async list(params: { limit?: number; cursor?: string | null } = {}): Promise<NotificationListResponse> {
    const query: Record<string, string | number> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.cursor) query.cursor = params.cursor;

    const response = await apiClient.get<NotificationListResponse>(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE, {
      params: query,
    });
    return response.data;
  }

  /**
   * How many notifications are unread. Cheap enough to poll.
   */
  static async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>(API_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return response.data.count;
  }

  static async markRead(id: string): Promise<void> {
    await apiClient.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ(id));
  }

  static async markAllRead(): Promise<void> {
    await apiClient.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ_ALL);
  }
}
