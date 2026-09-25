import { apiClient } from "@/api/client";
import { AlertStatus, SecurityAlert } from "@/types";

export const securityService = {
  listAlerts: (status?: AlertStatus) => apiClient.get<SecurityAlert[]>("/api/security/alerts", { params: { status_filter: status } }).then((r) => r.data),
  resolveAlert: (id: string, action: "LOCK_SESSION" | "REQUIRE_MFA" | "DISMISS" | "RESOLVE", note = "") =>
    apiClient.post<SecurityAlert>(`/api/security/alerts/${id}/resolve`, { action, note }).then((r) => r.data),
  activity: () => apiClient.get("/api/security/activity").then((r) => r.data),
};
