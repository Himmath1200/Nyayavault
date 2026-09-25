import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ShieldCheck, FileSearch } from "lucide-react";
import { verifyService } from "@/services/verify";
import { documentsService } from "@/services/documents";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/utils/format";
import { DocumentDetailDialog } from "@/components/DocumentDetailDialog";
import { can, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/api/client";

export default function Certificate() {
  const { user } = useAuth();
  const { certificateId } = useParams<{ certificateId: string }>();
  const [viewingDocument, setViewingDocument] = useState(false);
  const { data: cert, isLoading, isError, error: certError } = useQuery({
    queryKey: ["certificate", certificateId],
    queryFn: () => verifyService.getCertificate(certificateId!),
    enabled: !!certificateId,
    retry: false,
  });

  const { data: document, isError: documentError } = useQuery({
    queryKey: ["certificate-document", cert?.document_id],
    queryFn: () => documentsService.get(cert!.document_id),
    enabled: !!cert && viewingDocument,
  });

  if (isLoading) return <LoadingState />;
  if (isError || !cert) return <ErrorState message={apiErrorMessage(certError, "Certificate not found.")} />;

  const verifyUrl = `${window.location.origin}/verify/${cert.verification_id}`;
  const canViewDocument = can(user?.role, PERMISSIONS.DOCUMENT_VIEW);

  return (
    <div>
      <PageHeader
        title="DIGITAL EVIDENCE CERTIFICATE"
        subtitle="Printable, independently verifiable evidence certificate."
        actions={
          <>
            {canViewDocument && (
              <Button variant="secondary" size="sm" onClick={() => setViewingDocument(true)}>
                <FileSearch className="h-4 w-4" /> View Document
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        id="certificate"
        className="mx-auto max-w-2xl panel p-8 print:border-0 print:shadow-none"
      >
        <div className="mb-6 flex items-center justify-between border-b border-base-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">NyayaVault · NCRB Women Safety Division</p>
            <h2 className="mt-1 text-xl font-bold text-text-primary">Digital Evidence Verification Certificate</h2>
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 16 }}
          >
            <ShieldCheck className="h-9 w-9 text-status-success" />
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Field label="Certificate ID" value={cert.certificate_number} />
          <Field label="Verification ID" value={cert.verification_id} />
          <Field label="Case ID" value={cert.snapshot.case_number ?? cert.case_id} />
          <Field label="Evidence ID" value={cert.snapshot.evidence_number ?? ""} />
          <Field label="Document ID" value={cert.snapshot.document_number ?? ""} />
          <Field label="Document Type" value={(cert.snapshot.document_type ?? "").replace(/_/g, " ")} />
          <Field label="Verification Timestamp" value={formatDate(cert.issued_at)} />
          <Field label="Classification" value={(cert.snapshot.classification ?? "").replace(/_/g, " ")} />
        </div>

        <div className="mt-4">
          <p className="label-caps mb-1">SHA-256 Hash</p>
          <p className="mono break-all rounded bg-base-bg px-3 py-2 text-xs text-text-secondary">{cert.snapshot.sha256_hash}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-base-border pt-4 text-sm">
          <StatusLine ok={cert.hash_verified} label="Hash Verified" index={0} />
          <StatusLine ok={cert.custody_verified} label="Chain of Custody Verified" index={1} />
          <StatusLine ok={cert.signature_verified} label="Digital Signature Valid" index={2} />
          <StatusLine ok={cert.audit_complete} label="Audit Trail Complete" index={3} />
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-base-border pt-5">
          <div className="text-xs text-text-muted max-w-sm">
            This certificate provides a technical verification record and does not constitute a legal determination regarding the underlying evidence.
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-base-border bg-white p-2.5"
          >
            <QRCodeSVG value={verifyUrl} size={96} />
            <span className="text-[9px] text-black/60">Scan to verify</span>
          </motion.div>
        </div>
      </motion.div>

      {viewingDocument && documentError && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-status-critical">
          Could not load this document — you may not be assigned to its case or it may exceed your classification level.
        </p>
      )}

      <DocumentDetailDialog document={viewingDocument ? document ?? null : null} onClose={() => setViewingDocument(false)} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps mb-0.5">{label}</p>
      <p className="text-text-primary">{value || "—"}</p>
    </div>
  );
}

function StatusLine({ ok, label, index }: { ok: boolean; label: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.25 }}
      className={`flex items-center gap-2 ${ok ? "text-status-success" : "text-status-critical"}`}
    >
      <ShieldCheck className="h-4 w-4" /> {label}
    </motion.div>
  );
}
