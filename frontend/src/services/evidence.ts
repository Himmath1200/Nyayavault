import { apiClient } from "@/api/client";
import { CustodyEvent, CustodyStatus, EvidenceItem } from "@/types";

export const evidenceService = {
  list: (case_id?: string) => apiClient.get<EvidenceItem[]>("/api/evidence", { params: { case_id } }).then((r) => r.data),
  get: (id: string) => apiClient.get<EvidenceItem>(`/api/evidence/${id}`).then((r) => r.data),
  custody: (id: string) => apiClient.get<CustodyEvent[]>(`/api/evidence/${id}/custody`).then((r) => r.data),
  transfer: (id: string, payload: { to_custody_status: CustodyStatus; location?: string; reason?: string }) =>
    apiClient.post<EvidenceItem>(`/api/evidence/${id}/transfer`, payload).then((r) => r.data),
};
