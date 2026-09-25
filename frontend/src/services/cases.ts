import { apiClient } from "@/api/client";
import { Case, CasePriority, CaseStatus } from "@/types";

export const casesService = {
  list: (params?: { status?: CaseStatus; search?: string }) =>
    apiClient.get<Case[]>("/api/cases", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Case>(`/api/cases/${id}`).then((r) => r.data),
  create: (payload: { title: string; category: string; jurisdiction: string; description?: string; priority?: CasePriority }) =>
    apiClient.post<Case>("/api/cases", payload).then((r) => r.data),
  update: (id: string, payload: Partial<{ title: string; status: CaseStatus; priority: CasePriority; description: string }>) =>
    apiClient.put<Case>(`/api/cases/${id}`, payload).then((r) => r.data),
};
