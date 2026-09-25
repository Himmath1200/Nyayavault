import { apiClient } from "@/api/client";
import { NotificationItem } from "@/types";

export const notificationsService = {
  list: (unread_only = false) => apiClient.get<NotificationItem[]>("/api/notifications", { params: { unread_only } }).then((r) => r.data),
  markRead: (id: string) => apiClient.post<NotificationItem>(`/api/notifications/${id}/read`).then((r) => r.data),
};
