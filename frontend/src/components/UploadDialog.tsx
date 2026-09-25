import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CircleDashed, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { documentsService, UploadResult } from "@/services/documents";
import { apiErrorMessage } from "@/api/client";
import { Case, Classification, DocumentType } from "@/types";
import { useToast } from "@/context/ToastContext";

const DOC_TYPES: DocumentType[] = [
  "FIR", "POLICE_REPORT", "INVESTIGATION_REPORT", "WITNESS_STATEMENT", "CHARGE_SHEET",
  "COURT_FILING", "EVIDENCE_RECORD", "FORENSIC_REPORT", "LEGAL_NOTICE", "JUDGMENT", "OTHER",
];
const CLASSIFICATIONS: Classification[] = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "HIGHLY_CONFIDENTIAL", "SEALED"];

export function UploadDialog({
  open,
  onClose,
  cases,
  defaultCaseId,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  cases: Case[];
  defaultCaseId?: string;
  onComplete?: (result: UploadResult) => void;
}) {
  const [caseId, setCaseId] = useState(defaultCaseId ?? cases[0]?.id ?? "");
  const [docType, setDocType] = useState<DocumentType>("INVESTIGATION_REPORT");
  const [classification, setClassification] = useState<Classification>("CONFIDENTIAL");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const { push } = useToast();

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setProgress(0);
  }

  async function handleUpload() {
    if (!file || !caseId) return;
    setUploading(true);
    setError("");
    try {
      const res = await documentsService.upload({ case_id: caseId, document_type: docType, classification, file }, setProgress);
      setResult(res);
      onComplete?.(res);
      push({
        tone: "success",
        title: "Document sealed and secured",
        description: `${res.document.document_number} · Evidence DNA ${res.evidence_number} created.`,
      });
    } catch (err) {
      setError(apiErrorMessage(err, "Upload failed. The file may not meet validation requirements."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!uploading) {
          reset();
          onClose();
        }
      }}
      title="Upload Document to Secure Vault"
      width="max-w-lg"
    >
      {!result ? (
        <div className="space-y-3.5">
          <div>
            <Label>Case</Label>
            <Select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} — {c.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Classification</Label>
              <Select value={classification} onChange={(e) => setClassification(e.target.value as Classification)}>
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>File</Label>
            <input
              type="file"
              accept=".pdf,.txt,.png,.jpg,.jpeg,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-dashed border-base-border bg-base-bg px-3 py-4 text-xs text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-accent/10 file:px-2.5 file:py-1.5 file:text-xs file:text-accent"
            />
            <p className="mt-1 text-[11px] text-text-muted">PDF, TXT, DOCX, PNG, JPG — up to 25MB. Synthetic/demo evidence only.</p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> Uploading and processing ({progress}%)...
            </div>
          )}
          {error && <p className="text-xs text-status-critical">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpload} disabled={!file || !caseId || uploading}>
              {uploading ? "Processing..." : "Upload & Analyze"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            {result.steps.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs"
              >
                {step.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-success" />
                ) : step.status === "SKIPPED" ? (
                  <CircleDashed className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-status-critical" />
                )}
                <span className="font-medium text-text-primary">{step.step}</span>
                <span className="truncate text-text-muted">{step.detail}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-md border border-status-success/30 bg-status-success/10 px-3 py-2.5 text-xs text-status-success">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Document sealed as {result.document.document_number}. Evidence DNA {result.evidence_number} created.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                reset();
              }}
            >
              Upload Another
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
