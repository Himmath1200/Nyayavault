import { apiClient } from "@/api/client";
import { AuditEvent } from "@/types";

export const auditService = {
  list: (params?: { case_id?: string; action?: string; limit?: number }) =>
    apiClient.get<AuditEvent[]>("/api/audit", { params }).then((r) => r.data),
  chainIntegrity: () => apiClient.get<{ intact: boolean; broken_at_event_id: string | null; events_checked: number }>("/api/audit/chain-integrity").then((r) => r.data),
};
