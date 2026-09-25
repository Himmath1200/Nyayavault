import { apiClient } from "@/api/client";
import { DashboardSummary } from "@/types";

export const dashboardService = {
  summary: () => apiClient.get<DashboardSummary>("/api/dashboard/summary").then((r) => r.data),
};
