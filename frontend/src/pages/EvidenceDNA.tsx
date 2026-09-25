import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Fingerprint } from "lucide-react";
import { casesService } from "@/services/cases";
import { evidenceService } from "@/services/evidence";
import { documentsService } from "@/services/documents";
import { PageHeader } from "@/components/PageHeader";
import { Select, Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/StatusBadge";
import { EvidenceDNACard } from "@/components/EvidenceDNACard";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { truncateHash } from "@/utils/format";
import { staggerDelay } from "@/utils/motion";

export default function EvidenceDNA() {
  const [params] = useSearchParams();
  const [caseFilter, setCaseFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));

  const { data: cases } = useQuery({ queryKey: ["cases-all"], queryFn: () => casesService.list() });
  const { data: evidenceList, isLoading, isError } = useQuery({
    queryKey: ["evidence-list", caseFilter],
    queryFn: () => evidenceService.list(caseFilter === "all" ? undefined : caseFilter),
  });

  const filtered = (evidenceList ?? []).filter((e) => !search || e.evidence_number.toLowerCase().includes(search.toLowerCase()) || e.sha256_hash.includes(search));

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const { data: selectedDocument } = useQuery({
    queryKey: ["evidence-document", selected?.document_id],
    queryFn: () => documentsService.get(selected!.document_id),
    enabled: !!selected,
  });

  return (
    <div>
      <PageHeader title="EVIDENCE" subtitle="Evidence DNA profiles — cryptographic fingerprints for every piece of digital evidence." />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} className="w-64">
          <option value="all">All Cases</option>
          {cases?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_number} — {c.title}
            </option>
          ))}
        </Select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Evidence ID or hash..." className="w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="panel overflow-hidden lg:col-span-2">
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState />
          ) : filtered.length === 0 ? (
            <EmptyState title="No evidence found" icon={<Fingerprint className="h-5 w-5" />} />
          ) : (
            <div className="max-h-[70vh] divide-y divide-base-border overflow-y-auto">
              {filtered.map((e, idx) => (
                <motion.button
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: staggerDelay(idx), duration: 0.25 }}
                  onClick={() => setSelectedId(e.id)}
                  className="relative flex w-full items-center justify-between px-4 py-3 text-left hover:bg-base-hover"
                >
                  {selected?.id === e.id && (
                    <motion.div layoutId="evidence-select-bar" className="absolute inset-y-0 left-0 w-0.5 bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  <div className={selected?.id === e.id ? "relative" : ""}>
                    <p className="mono text-xs font-semibold text-text-primary">{e.evidence_number}</p>
                    <p className="mono text-[10px] text-text-muted">{truncateHash(e.sha256_hash, 20)}</p>
                  </div>
                  <StatusBadge value={e.integrity_status} />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selected && selectedDocument ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <EvidenceDNACard evidence={selected} document={selectedDocument} />
              </motion.div>
            ) : (
              <div className="panel">
                <EmptyState title="Select an evidence item" description="Choose an item from the list to view its full Evidence DNA profile." icon={<Fingerprint className="h-5 w-5" />} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
