import { apiClient } from "@/api/client";
import { AccessAction, AccessPurpose, AccessRequestItem } from "@/types";

export const accessService = {
  list: (mine_only = false) => apiClient.get<AccessRequestItem[]>("/api/access-requests", { params: { mine_only } }).then((r) => r.data),
  create: (payload: { document_id: string; purpose: AccessPurpose; action: AccessAction; justification?: string }) =>
    apiClient.post<AccessRequestItem>("/api/access-requests", payload).then((r) => r.data),
  decide: (id: string, approve: boolean, note = "") =>
    apiClient.post<AccessRequestItem>(`/api/access-requests/${id}/decision`, { approve, note }).then((r) => r.data),
};
