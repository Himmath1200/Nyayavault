export type UserRole =
  | "SYSTEM_ADMIN"
  | "INVESTIGATING_OFFICER"
  | "FORENSIC_OFFICER"
  | "COURT_OFFICER"
  | "LEGAL_OFFICER"
  | "AUDITOR"
  | "READ_ONLY_REVIEWER";

export type CaseStatus = "ACTIVE" | "CLOSED" | "SUSPENDED";
export type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SearchResult {
  type: "case" | "document" | "evidence" | "user";
  id: string;
  title: string;
  subtitle: string;
  case_id?: string | null;
}

export type DocumentType =
  | "FIR"
  | "POLICE_REPORT"
  | "INVESTIGATION_REPORT"
  | "WITNESS_STATEMENT"
  | "CHARGE_SHEET"
  | "COURT_FILING"
  | "EVIDENCE_RECORD"
  | "FORENSIC_REPORT"
  | "LEGAL_NOTICE"
  | "JUDGMENT"
  | "OTHER";

export type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "HIGHLY_CONFIDENTIAL" | "SEALED";
export type IntegrityStatus = "VERIFIED" | "UNVERIFIED" | "FAILED";
export type CustodyStatus = "WITH_INVESTIGATOR" | "WITH_FORENSICS" | "IN_TRANSIT" | "WITH_COURT" | "SEALED" | "ARCHIVED";
export type AccessPurpose = "INVESTIGATION" | "COURT_PREPARATION" | "FORENSIC_ANALYSIS" | "ADMINISTRATIVE_REVIEW" | "EVIDENCE_VERIFICATION";
export type AccessAction = "VIEW" | "DOWNLOAD" | "SHARE";
export type AccessRequestStatus = "PENDING" | "APPROVED" | "DENIED";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface User {
  id: string;
  email: string;
  full_name: string;
  badge_id: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  mfa_enabled: boolean;
  is_demo_account: boolean;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  category: string;
  jurisdiction: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  lead_officer_id: string;
  security_flagged: boolean;
  created_at: string;
  updated_at: string;
  lead_officer_name?: string;
  evidence_count?: number;
}

export interface DocumentItem {
  id: string;
  document_number: string;
  case_id: string;
  name: string;
  document_type: DocumentType;
  classification: Classification;
  status: string;
  current_version: number;
  uploaded_by: string;
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  integrity_status: IntegrityStatus;
  digital_signature_valid: boolean;
  custody_status: CustodyStatus;
  is_sealed: boolean;
  ai_summary: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItem {
  id: string;
  evidence_number: string;
  case_id: string;
  document_id: string;
  sha256_hash: string;
  file_size: number;
  mime_type: string;
  document_version: number;
  uploaded_by: string;
  digital_signature: string;
  integrity_status: IntegrityStatus;
  custody_status: CustodyStatus;
  last_verified_at: string | null;
  last_verified_by: string | null;
  created_at: string;
}

export interface CustodyEvent {
  id: string;
  evidence_id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  location: string;
  reason: string;
  document_hash: string;
  previous_event_hash: string;
  current_event_hash: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  case_id: string | null;
  document_id: string | null;
  metadata_json: Record<string, unknown>;
  ip_address: string;
  device: string;
  previous_event_hash: string;
  current_event_hash: string;
}

export interface SecurityAlert {
  id: string;
  user_id: string | null;
  risk_score: number;
  severity: AlertSeverity;
  event_summary: string;
  reasons: string[];
  detected_at: string;
  status: AlertStatus;
  resolution_note: string;
  ip_address: string;
  device: string;
}

export interface AccessRequestItem {
  id: string;
  document_id: string;
  requested_by: string;
  purpose: AccessPurpose;
  action: AccessAction;
  justification: string;
  status: AccessRequestStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  created_at: string;
}

export interface AccessDecisionCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface AccessDecision {
  granted: boolean;
  checks: AccessDecisionCheck[];
  reasons: string[];
}

export interface NotificationItem {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface VerificationCertificate {
  id: string;
  certificate_number: string;
  verification_id: string;
  evidence_id: string;
  document_id: string;
  case_id: string;
  issued_by: string;
  issued_at: string;
  hash_verified: boolean;
  custody_verified: boolean;
  signature_verified: boolean;
  audit_complete: boolean;
  snapshot: Record<string, string>;
}

export interface DashboardSummary {
  kpis: {
    active_cases: number;
    evidence_items: number;
    integrity_verified_pct: number;
    security_alerts: number;
    documents_today: number;
    pending_verification: number;
  };
  evidence_chain_status: { status: string; count: number }[];
  case_activity: { date: string; count: number }[];
  recent_events: {
    id: string;
    action: string;
    actor_role: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }[];
}
