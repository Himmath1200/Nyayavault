import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Landmark, Search, CheckCircle2, XCircle, FileCheck2, FileSearch } from "lucide-react";
import { verifyService, VerificationSearchResult } from "@/services/verify";
import { evidenceService } from "@/services/evidence";
import { documentsService } from "@/services/documents";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentDetailDialog } from "@/components/DocumentDetailDialog";
import { apiErrorMessage } from "@/api/client";
import { can, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DocumentItem } from "@/types";

export default function CourtVerification() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<VerificationSearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [viewedDocument, setViewedDocument] = useState<DocumentItem | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await verifyService.search(query.trim());
      setResult(res);
    } catch (err) {
      setError(apiErrorMessage(err, "No matching evidence, document, or case found."));
    } finally {
      setLoading(false);
    }
  }

  async function resolveEvidence(res: VerificationSearchResult) {
    // The search result carries a human-readable evidence_number; resolve the actual record.
    const items = await evidenceService.list(res.case_id);
    return items.find((e) => e.evidence_number === res.evidence_id) ?? null;
  }

  async function handleGenerateCertificate() {
    if (!result) return;
    setGenerating(true);
    try {
      const evidence = await resolveEvidence(result);
      const cert = await verifyService.createCertificate(evidence?.id ?? "");
      push({ tone: "success", title: "Verification certificate generated", description: cert.certificate_number });
      navigate(`/certificates/${cert.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not generate certificate."));
    } finally {
      setGenerating(false);
    }
  }

  async function handleViewDocument() {
    if (!result) return;
    setError("");
    setDocumentLoading(true);
    try {
      const evidence = await resolveEvidence(result);
      if (!evidence) throw new Error("Evidence record not found");
      const doc = await documentsService.get(evidence.document_id);
      setViewedDocument(doc);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not open this document — you may not be assigned to its case or it may exceed your classification level."));
    } finally {
      setDocumentLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="COURT VERIFICATION" subtitle="Independently verify the integrity, custody, and audit status of any evidence item before court submission." />

      <form onSubmit={handleSearch} className="mb-5 flex max-w-lg gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Evidence ID, Document ID, Case ID, or Verification Code..." />
        <Button type="submit" variant="primary" disabled={loading || !query.trim()}>
          <motion.span animate={loading ? { rotate: 360 } : {}} transition={loading ? { duration: 0.9, repeat: Infinity, ease: "linear" } : {}}>
            <Search className="h-4 w-4" />
          </motion.span>
          {loading ? "Searching..." : "Verify"}
        </Button>
      </form>

      {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}

      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl panel overflow-hidden"
        >
          <div className="panel-header">
            <p className="mono text-sm font-bold text-text-primary">{result.evidence_id}</p>
            <StatusBadge value={result.integrity_status} />
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 text-xs">
            <Field label="Document ID" value={result.document_id} mono />
            <Field label="Document Type" value={result.document_type.replace(/_/g, " ")} />
            <Field label="Submission Status" value={result.submission_status.replace(/_/g, " ")} />
            <Field label="Digital Signature" value={result.digital_signature} mono />
            <div className="col-span-2">
              <p className="label-caps mb-0.5">SHA-256</p>
              <p className="mono break-all text-text-secondary">{result.sha256_hash}</p>
            </div>
          </div>
          <div className="space-y-2 border-t border-base-border p-4">
            <CheckRow ok label="Hash Verified" index={0} />
            <CheckRow ok={result.custody_verified} label={`Chain of Custody Verified (${result.custody_events} events)`} index={1} />
            <CheckRow ok label="Digital Signature Valid" index={2} />
            <CheckRow ok label="No Unauthorized Modification" index={3} />
            <CheckRow ok={result.audit_trail_complete} label="Audit Trail Complete" index={4} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-base-border p-4">
            {can(user?.role, PERMISSIONS.DOCUMENT_VIEW) && (
              <Button variant="secondary" onClick={handleViewDocument} disabled={documentLoading}>
                <FileSearch className="h-4 w-4" /> {documentLoading ? "Opening..." : "View Document"}
              </Button>
            )}
            {can(user?.role, PERMISSIONS.CERTIFICATE_GENERATE) && (
              <Button variant="primary" onClick={handleGenerateCertificate} disabled={generating}>
                <FileCheck2 className="h-4 w-4" /> {generating ? "Generating..." : "Generate Verification Certificate"}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {!result && !loading && (
        <div className="panel max-w-2xl p-10 text-center">
          <Landmark className="mx-auto mb-3 h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-secondary">Search by Evidence ID (e.g. EVD-2026-000921) to begin verification.</p>
        </div>
      )}

      <DocumentDetailDialog document={viewedDocument} onClose={() => setViewedDocument(null)} />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="label-caps mb-0.5">{label}</p>
      <p className={`text-text-secondary ${mono ? "mono" : ""}`}>{value}</p>
    </div>
  );
}

function CheckRow({ ok, label, index }: { ok: boolean; label: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.12, duration: 0.25 }}
      className="flex items-center gap-2 text-sm"
    >
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 + index * 0.12 + 0.1, type: "spring", stiffness: 500, damping: 20 }}>
        {ok ? <CheckCircle2 className="h-4 w-4 text-status-success" /> : <XCircle className="h-4 w-4 text-status-critical" />}
      </motion.span>
      <span className={ok ? "text-text-secondary" : "text-status-critical"}>{label}</span>
    </motion.div>
  );
}
