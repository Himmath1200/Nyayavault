import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, ShieldAlert } from "lucide-react";
import { casesService } from "@/services/cases";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/utils/format";
import { CaseStatus } from "@/types";
import { NewCaseDialog } from "@/pages/cases/NewCaseDialog";
import { can, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
  { key: "high-priority", label: "High Priority" },
  { key: "security-alert", label: "Security Alert" },
];

export default function CaseList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const statusParam: CaseStatus | undefined = filter === "active" ? "ACTIVE" : filter === "closed" ? "CLOSED" : undefined;

  const { data: cases, isLoading, isError } = useQuery({
    queryKey: ["cases", search, statusParam],
    queryFn: () => casesService.list({ search: search || undefined, status: statusParam }),
  });

  const filtered = useMemo(() => {
    if (!cases) return [];
    if (filter === "high-priority") return cases.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL");
    if (filter === "security-alert") return cases.filter((c) => c.security_flagged);
    return cases;
  }, [cases, filter]);

  return (
    <div>
      <PageHeader
        title="CASE MANAGEMENT"
        subtitle="Browse, filter and manage active investigations across the platform."
        actions={
          can(user?.role, PERMISSIONS.CASE_CREATE) && (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Case
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by case ID, title, officer..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <motion.button
              key={f.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f.key)}
              className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                filter === f.key ? "border-accent/40 bg-accent/10 text-accent" : "border-base-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <LoadingState label="Loading cases..." />
        ) : isError ? (
          <ErrorState />
        ) : filtered.length === 0 ? (
          <EmptyState title="No cases found" description="Try adjusting your filters or search terms." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-base-border text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Case ID</th>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Jurisdiction</th>
                  <th className="px-4 py-2.5 font-medium">Lead Officer</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Evidence</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5 font-medium">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {filtered.map((c, idx) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.4), duration: 0.25 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="cursor-pointer"
                  >
                    <td className="px-4 py-3 mono text-xs text-accent">{c.case_number}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{c.title}</td>
                    <td className="px-4 py-3 text-text-secondary">{c.category}</td>
                    <td className="px-4 py-3 text-text-secondary">{c.jurisdiction}</td>
                    <td className="px-4 py-3 text-text-secondary">{c.lead_officer_name}</td>
                    <td className="px-4 py-3"><StatusBadge value={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge value={c.status} /></td>
                    <td className="px-4 py-3 text-text-secondary">{c.evidence_count}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{formatDate(c.updated_at)}</td>
                    <td className="px-4 py-3">
                      {c.security_flagged ? (
                        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
                          <ShieldAlert className="h-4 w-4 text-status-critical" />
                        </motion.div>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewCaseDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => navigate(`/cases/${id}`)} />
    </div>
  );
}
