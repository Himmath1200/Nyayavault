import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, ShieldQuestion, KeyRound } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { EvidenceDNACard } from "@/components/EvidenceDNACard";
import { AccessDecisionPanel } from "@/components/AccessDecisionPanel";
import { AccessRequestDialog } from "@/components/AccessRequestDialog";
import { DocumentPreview } from "@/components/DocumentPreview";
import { EmailVerificationGate } from "@/components/EmailVerificationGate";
import { documentsService, requiresEmailVerification } from "@/services/documents";
import { evidenceService } from "@/services/evidence";
import { DocumentItem } from "@/types";
import { apiErrorMessage } from "@/api/client";
import { can, defaultPurposeForRole, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";

export function DocumentDetailDialog({ document, onClose }: { document: DocumentItem | null; onClose: () => void }) {
  const { user } = useAuth();
  const purpose = defaultPurposeForRole(user?.role);
  const [accessOpen, setAccessOpen] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [unlocked, setUnlocked] = useState(true);

  const { data: evidenceList } = useQuery({
    queryKey: ["evidence-for-case", document?.case_id],
    queryFn: () => evidenceService.list(document!.case_id),
    enabled: !!document,
  });

  const { data: decision, refetch: refetchDecision } = useQuery({
    queryKey: ["access-check", document?.id, purpose],
    queryFn: () => documentsService.accessCheck(document!.id, purpose, "VIEW"),
    enabled: !!document,
  });

  useEffect(() => {
    setDownloadError("");
    setUnlocked(document?.classification !== "HIGHLY_CONFIDENTIAL");
  }, [document?.id, document?.classification]);

  if (!document) return null;
  const evidence = evidenceList?.find((e) => e.document_id === document.id);

  async function handleDownload() {
    setDownloadError("");
    try {
      await documentsService.download(document!.id, purpose, document!.name);
    } catch (err) {
      if (requiresEmailVerification(err)) {
        setUnlocked(false);
        setDownloadError("This document requires email verification first — complete it below, then try downloading again.");
        return;
      }
      setDownloadError(apiErrorMessage(err, "Access denied — this document exceeds your current permission level."));
    }
  }

  const footer = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => refetchDecision()}>
        <ShieldQuestion className="h-3.5 w-3.5" /> Re-check Access
      </Button>
      {can(user?.role, PERMISSIONS.ACCESS_REQUEST_CREATE) && (
        <Button variant="secondary" onClick={() => setAccessOpen(true)}>
          <KeyRound className="h-4 w-4" /> Request Access
        </Button>
      )}
      {can(user?.role, PERMISSIONS.DOCUMENT_DOWNLOAD) && (
        <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <Button variant="primary" onClick={handleDownload} className="text-base font-bold shadow-lg shadow-accent/20">
            <Download className="h-4.5 w-4.5" /> Download
          </Button>
        </motion.div>
      )}
    </div>
  );

  return (
    <Dialog open={!!document} onClose={onClose} title={document.name} width="max-w-2xl" footer={footer}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={document.document_type} />
          <StatusBadge value={document.classification} />
          <StatusBadge value={document.status} />
          {document.ai_summary && <span className="mono text-[11px] text-text-muted">{document.document_number}</span>}
        </div>

        {document.ai_summary && (
          <div className="rounded-md border border-accent/20 bg-accent/5 p-3 text-xs text-text-secondary">
            <p className="label-caps mb-1 text-accent">AI Summary</p>
            {document.ai_summary}
          </div>
        )}

        {evidence && <EvidenceDNACard evidence={evidence} document={document} />}

        {decision && <AccessDecisionPanel decision={decision} />}

        {decision?.granted && (
          <div>
            <p className="label-caps mb-1.5">Document Content</p>
            {unlocked ? (
              <DocumentPreview document={document} purpose={purpose} onEmailVerificationRequired={() => setUnlocked(false)} />
            ) : (
              <EmailVerificationGate documentId={document.id} purpose={purpose} onVerified={() => setUnlocked(true)} />
            )}
          </div>
        )}

        {downloadError && <p className="text-xs text-status-critical">{downloadError}</p>}
      </div>

      <AccessRequestDialog open={accessOpen} onClose={() => setAccessOpen(false)} documentId={document.id} />
    </Dialog>
  );
}
