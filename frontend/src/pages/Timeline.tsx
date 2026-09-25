import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarClock, FileText } from "lucide-react";
import { aiService } from "@/services/ai";
import { documentsService } from "@/services/documents";
import { PageHeader } from "@/components/PageHeader";
import { CaseSelector, useCaseSelector } from "@/components/CaseSelector";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Dialog } from "@/components/ui/Dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/utils/format";
import { DocumentItem } from "@/types";

export default function Timeline() {
  const { cases, defaultCaseId } = useCaseSelector();
  const [caseId, setCaseId] = useState<string>("");
  const activeCaseId = caseId || defaultCaseId || "";
  const [openDoc, setOpenDoc] = useState<DocumentItem | null>(null);

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["timeline", activeCaseId],
    queryFn: () => aiService.timeline(activeCaseId),
    enabled: !!activeCaseId,
  });

  async function openSource(documentId: string | null) {
    if (!documentId) return;
    const doc = await documentsService.get(documentId);
    setOpenDoc(doc);
  }

  const grouped = groupByDay(events ?? []);

  return (
    <div>
      <PageHeader title="AI TIMELINE" subtitle="Chronological reconstruction of case events extracted from documents. Confidence reflects extraction certainty, not truth." />

      <div className="mb-4">
        <CaseSelector cases={cases} value={activeCaseId} onChange={setCaseId} />
      </div>

      {isLoading ? (
        <LoadingState label="Reconstructing timeline..." />
      ) : isError ? (
        <ErrorState message="AI analysis temporarily unavailable. Existing case records remain accessible." />
      ) : !events || events.length === 0 ? (
        <div className="panel">
          <EmptyState title="No timeline events found" description="No dated events could be extracted from this case's documents yet." icon={<CalendarClock className="h-5 w-5" />} />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayEvents], groupIdx) => (
            <motion.div key={day} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: groupIdx * 0.06 }}>
              <p className="mb-2 label-caps">{day}</p>
              <div className="relative space-y-2 pl-4">
                <div className="absolute left-[3px] top-2 bottom-2 w-px bg-base-border" />
                {dayEvents.map((event, idx) => (
                  <motion.button
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                    whileHover={{ x: 2 }}
                    onClick={() => openSource(event.document_id)}
                    className="relative flex w-full items-center justify-between gap-3 panel px-4 py-3 text-left hover:border-accent/40"
                  >
                    <span className="absolute -left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent ring-4 ring-base-bg" />
                    <div className="flex items-center gap-3">
                      <div className="mono text-xs text-accent w-14 shrink-0">{formatDate(event.date, "HH:mm")}</div>
                      <p className="text-sm text-text-primary">{event.event}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-text-muted">{Math.round(event.confidence * 100)}% confidence</span>
                      <FileText className="h-3.5 w-3.5 text-text-muted" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!openDoc} onClose={() => setOpenDoc(null)} title={openDoc?.name ?? "Source Document"}>
        {openDoc && (
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={openDoc.document_type} />
              <StatusBadge value={openDoc.classification} />
            </div>
            <p className="text-text-secondary">{openDoc.ai_summary || "No AI summary available for this document."}</p>
            <p className="mono text-text-muted">{openDoc.document_number} · {openDoc.sha256_hash.slice(0, 24)}...</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function groupByDay(events: { id: string; date: string; event: string; confidence: number; document_id: string | null }[]) {
  const map = new Map<string, typeof events>();
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const event of sorted) {
    const day = formatDate(event.date, "dd MMM yyyy").toUpperCase();
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(event);
  }
  return Array.from(map.entries());
}
