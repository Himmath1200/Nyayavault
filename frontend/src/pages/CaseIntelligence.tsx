import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, MapPin, Users, Sparkles } from "lucide-react";
import { aiService } from "@/services/ai";
import { evidenceService } from "@/services/evidence";
import { documentsService } from "@/services/documents";
import { PageHeader } from "@/components/PageHeader";
import { CaseSelector, useCaseSelector } from "@/components/CaseSelector";
import { CaseGraph } from "@/components/CaseGraph";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { staggerDelay } from "@/utils/motion";

export default function CaseIntelligence() {
  const { cases, defaultCaseId } = useCaseSelector();
  const [caseId, setCaseId] = useState<string>("");
  const activeCaseId = caseId || defaultCaseId || "";
  const activeCase = cases.find((c) => c.id === activeCaseId);

  const { data: insights, isLoading, isError } = useQuery({
    queryKey: ["case-insights", activeCaseId],
    queryFn: () => aiService.caseInsights(activeCaseId),
    enabled: !!activeCaseId,
  });
  const { data: contradictions } = useQuery({
    queryKey: ["contradictions", activeCaseId],
    queryFn: () => aiService.contradictions(activeCaseId),
    enabled: !!activeCaseId,
  });
  const { data: evidenceList } = useQuery({
    queryKey: ["evidence-list", activeCaseId],
    queryFn: () => evidenceService.list(activeCaseId),
    enabled: !!activeCaseId,
  });
  const { data: documents } = useQuery({
    queryKey: ["documents", activeCaseId],
    queryFn: () => documentsService.list(activeCaseId),
    enabled: !!activeCaseId,
  });

  return (
    <div>
      <PageHeader title="CASE INTELLIGENCE" subtitle="AI-assisted relationship graph and case understanding. Supports investigators — does not make legal determinations." />

      <div className="mb-4">
        <CaseSelector cases={cases} value={activeCaseId} onChange={setCaseId} />
      </div>

      {isLoading ? (
        <LoadingState label="Building case intelligence..." />
      ) : isError || !insights ? (
        <ErrorState message="AI analysis temporarily unavailable. Existing case records remain accessible." />
      ) : !insights.available ? (
        <div className="panel p-6 text-center text-sm text-text-secondary">{insights.message}</div>
      ) : (
        <>
          {activeCase && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="panel mb-4 overflow-hidden">
              <div className="panel-header">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                    <Sparkles className="h-4 w-4 text-accent" />
                  </motion.span>
                  Relationship Graph
                </p>
              </div>
              <CaseGraph
                case={activeCase}
                people={insights.key_people ?? []}
                locations={insights.key_locations ?? []}
                evidenceNumbers={(evidenceList ?? []).map((e) => e.evidence_number)}
                documentNames={(documents ?? []).map((d) => d.name)}
              />
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="panel p-4 lg:col-span-2">
              <p className="label-caps mb-2">Case Summary</p>
              <p className="text-sm text-text-secondary">{insights.summary}</p>
              {insights.risk_signals && insights.risk_signals.length > 0 && (
                <div className="mt-4 border-t border-base-border pt-3">
                  <p className="label-caps mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-status-warning" /> Risk Signals</p>
                  <ul className="space-y-1.5 text-xs text-text-secondary list-disc pl-4">
                    {insights.risk_signals.map((signal, i) => (
                      <li key={i}>{signal}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-4 text-[11px] italic text-text-muted border-t border-base-border pt-3">{insights.disclaimer}</p>
            </motion.div>

            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.35 }} className="panel p-4">
                <p className="label-caps mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Key People</p>
                <div className="flex flex-wrap gap-1.5">
                  {(insights.key_people ?? []).length === 0 ? (
                    <p className="text-xs text-text-muted">No named individuals identified yet.</p>
                  ) : (
                    insights.key_people!.map((p, idx) => (
                      <motion.div key={p} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: staggerDelay(idx, 0.04) }}>
                        <Badge tone="accent">{p}</Badge>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.35 }} className="panel p-4">
                <p className="label-caps mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {(insights.key_locations ?? []).length === 0 ? (
                    <p className="text-xs text-text-muted">No locations identified yet.</p>
                  ) : (
                    insights.key_locations!.map((l, idx) => (
                      <motion.div key={l} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: staggerDelay(idx, 0.04) }}>
                        <Badge tone="success">{l}</Badge>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {contradictions && contradictions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.35 }} className="panel mt-4 p-4">
              <p className="label-caps mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-status-warning" /> Potential Inconsistencies</p>
              <div className="space-y-2">
                {contradictions.map((c, idx) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: staggerDelay(idx) }}
                    className="rounded-md border border-status-warning/25 bg-status-warning/5 px-3 py-2 text-xs text-text-secondary"
                  >
                    {c.description}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
