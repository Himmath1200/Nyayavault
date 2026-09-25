import { useState } from "react";
import { motion } from "framer-motion";
import { Dna, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { DocumentItem, EvidenceItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { documentsService, IntegrityVerifyResult } from "@/services/documents";
import { formatBytes, formatDate } from "@/utils/format";
import { apiErrorMessage } from "@/api/client";
import { useToast } from "@/context/ToastContext";

export function EvidenceDNACard({ evidence, document }: { evidence: EvidenceItem; document: DocumentItem }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<IntegrityVerifyResult | null>(null);
  const [error, setError] = useState("");
  const { push } = useToast();

  async function handleVerify() {
    setVerifying(true);
    setError("");
    try {
      const res = await documentsService.verify(document.id);
      setResult(res);
      push(
        res.match
          ? { tone: "success", title: "Document integrity verified", description: "SHA-256 hash matches the original record." }
          : { tone: "error", title: "Integrity violation detected", description: "Current hash does not match the original — investigation required." }
      );
    } catch (err) {
      setError(apiErrorMessage(err, "Verification could not be completed."));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-base-border bg-gradient-to-r from-accent/10 to-transparent px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Dna className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="mono text-sm font-bold text-text-primary">{evidence.evidence_number}</p>
            <p className="text-[11px] text-text-muted">Evidence DNA Profile</p>
          </div>
        </div>
        <StatusBadge value={evidence.integrity_status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-xs sm:grid-cols-3">
        <Field label="Document ID" value={document.document_number} mono />
        <Field label="File Size" value={formatBytes(evidence.file_size)} />
        <Field label="MIME Type" value={evidence.mime_type} />
        <Field label="Version" value={`v${evidence.document_version}`} />
        <Field label="Uploaded" value={formatDate(evidence.created_at)} />
        <Field label="Custody Status" value={evidence.custody_status.replace(/_/g, " ")} />
        <div className="col-span-2 sm:col-span-3">
          <p className="label-caps mb-1">SHA-256 Hash</p>
          <p className="mono break-all rounded bg-base-bg px-2 py-1.5 text-[11px] text-text-secondary">{evidence.sha256_hash}</p>
        </div>
        <Field label="Digital Signature" value={evidence.digital_signature || "—"} mono />
        <Field label="Last Verified" value={formatDate(evidence.last_verified_at)} />
      </div>

      <div className="border-t border-base-border p-4">
        <Button variant="secondary" size="sm" onClick={handleVerify} disabled={verifying}>
          {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {verifying ? "Verifying..." : "Verify Integrity"}
        </Button>

        {error && <p className="mt-2 text-xs text-status-critical">{error}</p>}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 rounded-md border p-3 ${result.match ? "border-status-success/30 bg-status-success/10" : "border-status-critical/30 bg-status-critical/10"}`}
          >
            <div className={`flex items-center gap-2 text-sm font-semibold ${result.match ? "text-status-success" : "text-status-critical"}`}>
              {result.match ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {result.match ? "DOCUMENT INTEGRITY VERIFIED" : "INTEGRITY VIOLATION DETECTED"}
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-text-secondary">
              <p>
                Original Hash: <span className="mono text-text-muted">{result.original_hash}</span>
              </p>
              <p>
                Current Hash: <span className="mono text-text-muted">{result.current_hash}</span>
              </p>
              <p>Verified {formatDate(result.verified_at)} by {result.verified_by}</p>
              {result.requires_investigation && <p className="font-semibold text-status-critical">Requires investigation — chain of custody review recommended.</p>}
            </div>
          </motion.div>
        )}
      </div>
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
