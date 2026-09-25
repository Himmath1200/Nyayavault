import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { casesService } from "@/services/cases";
import { documentsService } from "@/services/documents";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { DocumentTable } from "@/components/DocumentTable";
import { UploadDialog } from "@/components/UploadDialog";
import { DocumentDetailDialog } from "@/components/DocumentDetailDialog";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { DocumentItem } from "@/types";
import { can, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";

export default function DocumentVault() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [caseFilter, setCaseFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const { data: cases } = useQuery({ queryKey: ["cases-all"], queryFn: () => casesService.list() });
  const { data: documents, isLoading, isError } = useQuery({
    queryKey: ["documents", caseFilter],
    queryFn: () => documentsService.list(caseFilter === "all" ? undefined : caseFilter),
  });

  const filtered = useMemo(() => {
    if (!documents) return [];
    return typeFilter === "all" ? documents : documents.filter((d) => d.document_type === typeFilter);
  }, [documents, typeFilter]);

  const preselectedId = params.get("doc");
  const preselected = preselectedId ? documents?.find((d) => d.id === preselectedId) ?? null : null;

  return (
    <div>
      <PageHeader
        title="SECURE DOCUMENT VAULT"
        subtitle="Cryptographically sealed legal and investigation documents with full custody tracking."
        actions={
          can(user?.role, PERMISSIONS.DOCUMENT_UPLOAD) && (
            <Button variant="primary" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} className="w-64">
          <option value="all">All Cases</option>
          {cases?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_number} — {c.title}
            </option>
          ))}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-56">
          <option value="all">All Document Types</option>
          {["FIR", "POLICE_REPORT", "INVESTIGATION_REPORT", "WITNESS_STATEMENT", "CHARGE_SHEET", "COURT_FILING", "EVIDENCE_RECORD", "FORENSIC_REPORT", "LEGAL_NOTICE", "JUDGMENT", "OTHER"].map(
            (t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            )
          )}
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="panel overflow-hidden">
        {isLoading ? <LoadingState label="Loading documents..." /> : isError ? <ErrorState /> : <DocumentTable documents={filtered} onSelect={setSelectedDoc} />}
      </motion.div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} cases={cases ?? []} defaultCaseId={caseFilter !== "all" ? caseFilter : undefined} />
      <DocumentDetailDialog document={selectedDoc ?? preselected} onClose={() => setSelectedDoc(null)} />
    </div>
  );
}
