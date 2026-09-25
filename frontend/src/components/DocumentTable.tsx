import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Lock } from "lucide-react";
import { DocumentItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { formatBytes, formatDate, truncateHash } from "@/utils/format";

export function DocumentTable({ documents, onSelect }: { documents: DocumentItem[]; onSelect?: (doc: DocumentItem) => void }) {
  const navigate = useNavigate();

  if (documents.length === 0) {
    return <EmptyState title="No documents found" description="No documents have been uploaded for this scope yet." icon={<FileText className="h-5 w-5" />} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-base-border text-[11px] uppercase tracking-wide text-text-muted">
            <th className="px-4 py-2.5 font-medium">Document</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Classification</th>
            <th className="px-4 py-2.5 font-medium">Version</th>
            <th className="px-4 py-2.5 font-medium">Size</th>
            <th className="px-4 py-2.5 font-medium">Hash</th>
            <th className="px-4 py-2.5 font-medium">Integrity</th>
            <th className="px-4 py-2.5 font-medium">Custody</th>
            <th className="px-4 py-2.5 font-medium">Modified</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-border">
          {documents.map((doc, idx) => (
            <motion.tr
              key={doc.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.025, 0.4), duration: 0.25 }}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              onClick={() => (onSelect ? onSelect(doc) : navigate(`/vault?doc=${doc.id}`))}
              className="cursor-pointer"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {doc.is_sealed && <Lock className="h-3.5 w-3.5 shrink-0 text-status-critical" />}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary max-w-[220px]">{doc.name}</p>
                    <p className="mono text-[11px] text-text-muted">{doc.document_number}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-text-secondary">{doc.document_type.replace(/_/g, " ")}</td>
              <td className="px-4 py-3"><StatusBadge value={doc.classification} /></td>
              <td className="px-4 py-3 text-text-secondary">v{doc.current_version}</td>
              <td className="px-4 py-3 text-text-secondary">{formatBytes(doc.file_size)}</td>
              <td className="px-4 py-3 mono text-[11px] text-text-muted">{truncateHash(doc.sha256_hash, 10)}</td>
              <td className="px-4 py-3"><StatusBadge value={doc.integrity_status} /></td>
              <td className="px-4 py-3"><StatusBadge value={doc.custody_status} /></td>
              <td className="px-4 py-3 text-[11px] text-text-muted">{formatDate(doc.updated_at)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
