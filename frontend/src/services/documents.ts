import axios from "axios";
import { apiClient } from "@/api/client";
import { AccessAction, AccessDecision, AccessPurpose, Classification, DocumentItem, DocumentType } from "@/types";

export interface UploadStep {
  step: string;
  status: string;
  detail: string;
}

export interface UploadResult {
  document: DocumentItem;
  evidence_id: string;
  evidence_number: string;
  steps: UploadStep[];
}

export interface IntegrityVerifyResult {
  integrity_status: string;
  original_hash: string;
  current_hash: string;
  match: boolean;
  verified_at: string;
  verified_by: string;
  requires_investigation: boolean;
}

export interface EmailVerificationRequestResult {
  sent: boolean;
  masked_email: string;
  expires_in_minutes: number;
  demo_code: string | null;
}

export interface EmailVerificationConfirmResult {
  verified: boolean;
  unlocked_until: string;
}

export const documentsService = {
  list: (case_id?: string) => apiClient.get<DocumentItem[]>("/api/documents", { params: { case_id } }).then((r) => r.data),
  get: (id: string) => apiClient.get<DocumentItem>(`/api/documents/${id}`).then((r) => r.data),
  upload: (form: { case_id: string; document_type: DocumentType; classification: Classification; file: File }, onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    fd.append("case_id", form.case_id);
    fd.append("document_type", form.document_type);
    fd.append("classification", form.classification);
    fd.append("file", form.file);
    return apiClient
      .post<UploadResult>("/api/documents/upload", fd, {
        // No explicit Content-Type here — the browser must generate the multipart boundary
        // itself from the FormData body. Setting "multipart/form-data" manually (even though
        // it looks correct) suppresses that boundary, and the server can't parse the body at
        // all without one, so every upload would fail regardless of the file or case.
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      })
      .then((r) => r.data);
  },
  verify: (id: string) => apiClient.post<IntegrityVerifyResult>(`/api/documents/${id}/verify`).then((r) => r.data),
  accessCheck: (id: string, purpose: AccessPurpose, action: AccessAction) =>
    apiClient.get<AccessDecision>(`/api/documents/${id}/access-check`, { params: { purpose, action } }).then((r) => r.data),
  // Read-only, in-browser preview — evaluates the VIEW action, so it works for any role with
  // DOCUMENT_VIEW (all of them), independent of whether they also hold DOCUMENT_DOWNLOAD.
  fetchContent: (id: string, purpose: AccessPurpose) =>
    apiClient.get<ArrayBuffer>(`/api/documents/${id}/view`, { params: { purpose }, responseType: "arraybuffer" }).then((r) => ({
      data: r.data,
      mimeType: (r.headers["content-type"] as string) || "application/octet-stream",
    })),
  // Saves a local copy — evaluates the DOWNLOAD action, which only some roles hold even when
  // they can view the same document.
  download: async (id: string, purpose: AccessPurpose, filename: string) => {
    const resp = await apiClient.get<ArrayBuffer>(`/api/documents/${id}/download`, { params: { purpose }, responseType: "arraybuffer" });
    const mimeType = (resp.headers["content-type"] as string) || "application/octet-stream";
    const url = window.URL.createObjectURL(new Blob([resp.data], { type: mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  requestEmailVerification: (id: string, purpose: AccessPurpose) =>
    apiClient.post<EmailVerificationRequestResult>(`/api/documents/${id}/email-verification/request`, null, { params: { purpose } }).then((r) => r.data),
  confirmEmailVerification: (id: string, code: string) =>
    apiClient.post<EmailVerificationConfirmResult>(`/api/documents/${id}/email-verification/confirm`, { code }).then((r) => r.data),
};

export function requiresEmailVerification(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403 && !!error.response?.data?.detail?.requires_email_verification;
}
