import { apiClient } from "@/api/client";

export interface TimelineEvent {
  id: string;
  date: string;
  event: string;
  confidence: number;
  document_id: string | null;
}

export interface Contradiction {
  id: string;
  category: string;
  severity: string;
  description: string;
  document_a_id: string | null;
  document_b_id: string | null;
  requires_human_review: boolean;
  status: string;
}

export interface CaseInsights {
  available: boolean;
  message?: string;
  is_live_ai?: boolean;
  summary?: string;
  key_people?: string[];
  key_locations?: string[];
  risk_signals?: string[];
  disclaimer?: string;
  document_count?: number;
}

export interface CaseAnswer {
  answer: string;
  source_documents: string[];
  confidence: number;
  is_live_ai: boolean;
}

export interface DocumentAnalysis {
  available: boolean;
  message?: string;
  is_live_ai?: boolean;
  classification?: { document_type: string; confidence: number; classification: string };
  entities?: {
    persons: string[];
    locations: string[];
    organizations: string[];
    dates: string[];
    evidence_items: string[];
    case_numbers: string[];
    legal_sections: string[];
  };
}

export const aiService = {
  analyzeDocument: (documentId: string) => apiClient.post<DocumentAnalysis>(`/api/ai/analyze-document/${documentId}`).then((r) => r.data),
  timeline: (caseId: string) => apiClient.get<TimelineEvent[]>(`/api/ai/timeline/${caseId}`).then((r) => r.data),
  contradictions: (caseId: string) => apiClient.get<Contradiction[]>(`/api/ai/contradictions/${caseId}`).then((r) => r.data),
  caseInsights: (caseId: string) => apiClient.get<CaseInsights>(`/api/ai/case-insights/${caseId}`).then((r) => r.data),
  ask: (caseId: string, question: string) => apiClient.post<CaseAnswer>("/api/ai/ask", { case_id: caseId, question }).then((r) => r.data),
};
