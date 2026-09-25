import axios from "axios";
import { apiClient } from "@/api/client";
import { VerificationCertificate } from "@/types";

export interface VerificationSearchResult {
  evidence_id: string;
  document_id: string;
  case_id: string;
  document_type: string;
  sha256_hash: string;
  integrity_status: string;
  digital_signature: string;
  custody_verified: boolean;
  custody_events: number;
  audit_trail_complete: boolean;
  submission_status: string;
}

export interface PublicVerification {
  evidence_id: string;
  document_type: string;
  case_number: string;
  integrity_status: string;
  sha256_hash: string;
  verification_timestamp: string;
  certificate_id: string;
  hash_verified: boolean;
  custody_verified: boolean;
  signature_verified: boolean;
  audit_complete: boolean;
  disclaimer: string;
}

export interface ResolvedVerification {
  document_id: string;
  case_id: string;
  evidence_id: string;
}

export const verifyService = {
  search: (query: string) => apiClient.get<VerificationSearchResult>("/api/verify/search", { params: { query } }).then((r) => r.data),
  publicVerify: (verificationId: string) =>
    axios.get<PublicVerification>(`${apiClient.defaults.baseURL}/api/verify/${verificationId}`).then((r) => r.data),
  // Requires the viewer to be signed in — resolves the printed ID to real object IDs so the
  // document can then be opened through the normal, permission-checked document endpoints.
  resolve: (verificationId: string) => apiClient.get<ResolvedVerification>(`/api/verify/${verificationId}/resolve`).then((r) => r.data),
  createCertificate: (evidence_id: string) => apiClient.post<VerificationCertificate>("/api/certificates", { evidence_id }).then((r) => r.data),
  getCertificate: (id: string) => apiClient.get<VerificationCertificate>(`/api/certificates/${id}`).then((r) => r.data),
};
