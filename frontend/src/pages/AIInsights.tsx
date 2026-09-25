import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Send, Sparkles, FileSearch } from "lucide-react";
import { aiService, CaseAnswer } from "@/services/ai";
import { PageHeader } from "@/components/PageHeader";
import { CaseSelector, useCaseSelector } from "@/components/CaseSelector";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { staggerDelay } from "@/utils/motion";

const SEVERITY_TONE: Record<string, "warning" | "critical" | "info"> = { LOW: "info", MEDIUM: "warning", HIGH: "critical" };

export default function AIInsights() {
  const { cases, defaultCaseId } = useCaseSelector();
  const [caseId, setCaseId] = useState<string>("");
  const activeCaseId = caseId || defaultCaseId || "";

  const { data: contradictions, isLoading, isError } = useQuery({
    queryKey: ["contradictions", activeCaseId],
    queryFn: () => aiService.contradictions(activeCaseId),
    enabled: !!activeCaseId,
  });

  return (
    <div>
      <PageHeader title="AI INSIGHTS" subtitle="Automated pattern detection to support human review. AI never determines guilt, innocence, or legal outcomes." />

      <div className="mb-4">
        <CaseSelector cases={cases} value={activeCaseId} onChange={setCaseId} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <p className="label-caps mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-status-warning" /> Potential Inconsistencies</p>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message="AI analysis temporarily unavailable. Existing case records remain accessible." />
          ) : !contradictions || contradictions.length === 0 ? (
            <div className="panel">
              <EmptyState title="No inconsistencies detected" description="AI review of this case's documents found no timeline or factual conflicts requiring attention." icon={<FileSearch className="h-5 w-5" />} />
            </div>
          ) : (
            <div className="space-y-3">
              {contradictions.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: staggerDelay(idx), duration: 0.3 }}
                  whileHover={{ x: 2 }}
                  className="panel p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-primary">Potential Inconsistency — {c.category}</p>
                    <Badge tone={SEVERITY_TONE[c.severity] ?? "warning"}>{c.severity}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{c.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-base-border pt-2.5">
                    <span className="text-[11px] font-semibold text-status-warning">Required Action: Human Review</span>
                    <Badge tone="neutral">{c.status}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          <CaseAssistant caseId={activeCaseId} />
        </div>
      </div>
    </div>
  );
}

function CaseAssistant({ caseId }: { caseId: string }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ question: string; answer: CaseAnswer }[]>([]);
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "What evidence is associated with this case?",
    "Show all forensic reports.",
    "Are there any potential timeline inconsistencies?",
    "What documents mention a mobile phone?",
  ];

  async function ask(q: string) {
    if (!q.trim() || !caseId) return;
    setLoading(true);
    try {
      const answer = await aiService.ask(caseId, q);
      setHistory((h) => [...h, { question: q, answer }]);
      setQuestion("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel flex h-full flex-col">
      <div className="panel-header">
        <p className="text-sm font-semibold flex items-center gap-2">
          <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <Sparkles className="h-4 w-4 text-accent" />
          </motion.span>
          Ask This Case
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[420px]">
        {history.length === 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-text-muted mb-2">Try asking:</p>
            {suggestions.map((s, idx) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                whileHover={{ x: 2 }}
                onClick={() => ask(s)}
                className="block w-full rounded-md border border-base-border px-2.5 py-1.5 text-left text-xs text-text-secondary hover:border-accent/40 hover:text-text-primary"
              >
                {s}
              </motion.button>
            ))}
          </div>
        )}
        {history.map((item, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-1.5">
            <p className="text-xs font-medium text-text-primary">{item.question}</p>
            <div className="rounded-md bg-base-bg p-2.5 text-xs text-text-secondary">
              <p className="label-caps mb-1">Answer</p>
              <p>{item.answer.answer}</p>
              {item.answer.source_documents.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.answer.source_documents.map((d) => (
                    <Badge key={d} tone="accent">{d}</Badge>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-text-muted">Relevance: {Math.round(item.answer.confidence * 100)}%</p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-1 px-1 py-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-accent"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex items-center gap-2 border-t border-base-border p-3"
      >
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this case..." disabled={!caseId} />
        <Button type="submit" variant="primary" size="sm" disabled={loading || !caseId}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
