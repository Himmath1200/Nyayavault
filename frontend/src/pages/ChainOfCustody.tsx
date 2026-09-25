import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { History, ArrowRightLeft } from "lucide-react";
import { casesService } from "@/services/cases";
import { evidenceService } from "@/services/evidence";
import { PageHeader } from "@/components/PageHeader";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CustodyTimeline } from "@/components/CustodyTimeline";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { StatusBadge } from "@/components/StatusBadge";
import { TransferEvidenceDialog } from "@/components/TransferEvidenceDialog";
import { can, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";

export default function ChainOfCustody() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [caseFilter, setCaseFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: cases } = useQuery({ queryKey: ["cases-all"], queryFn: () => casesService.list() });
  const { data: evidenceList } = useQuery({
    queryKey: ["evidence-list", caseFilter],
    queryFn: () => evidenceService.list(caseFilter === "all" ? undefined : caseFilter),
  });

  const selected = evidenceList?.find((e) => e.id === selectedId) ?? evidenceList?.[0] ?? null;

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["custody", selected?.id],
    queryFn: () => evidenceService.custody(selected!.id),
    enabled: !!selected,
  });

  return (
    <div>
      <PageHeader title="CHAIN OF CUSTODY" subtitle="Cryptographically hash-linked custody events for every evidence item." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} className="w-64">
          <option value="all">All Cases</option>
          {cases?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_number} — {c.title}
            </option>
          ))}
        </Select>
        <Select value={selected?.id ?? ""} onChange={(e) => setSelectedId(e.target.value)} className="w-72">
          {evidenceList?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.evidence_number}
            </option>
          ))}
        </Select>
        {selected && can(user?.role, PERMISSIONS.EVIDENCE_TRANSFER) && (
          <Button variant="secondary" size="sm" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Custody
          </Button>
        )}
      </div>

      {!selected ? (
        <div className="panel">
          <EmptyState title="No evidence available" icon={<History className="h-5 w-5" />} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div
            key={`summary-${selected.id}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="panel p-4"
          >
            <p className="label-caps mb-2">Selected Evidence</p>
            <p className="mono text-sm font-semibold text-text-primary">{selected.evidence_number}</p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-text-muted">Custody Status</span><StatusBadge value={selected.custody_status} /></div>
              <div className="flex justify-between"><span className="text-text-muted">Integrity</span><StatusBadge value={selected.integrity_status} /></div>
            </div>
          </motion.div>
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <LoadingState key="loading" />
              ) : isError ? (
                <ErrorState key="error" />
              ) : (
                <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  <CustodyTimeline events={events ?? []} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {selected && (
        <TransferEvidenceDialog
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          evidenceId={selected.id}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["custody", selected.id] });
            queryClient.invalidateQueries({ queryKey: ["evidence-list"] });
          }}
        />
      )}
    </div>
  );
}
