import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ScrollText, ShieldCheck, ShieldAlert } from "lucide-react";
import { auditService } from "@/services/audit";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatDate, truncateHash } from "@/utils/format";

export default function AuditTrail() {
  const { data: events, isLoading, isError } = useQuery({ queryKey: ["audit-events"], queryFn: () => auditService.list({ limit: 300 }) });
  const { data: chain } = useQuery({ queryKey: ["audit-chain-integrity"], queryFn: auditService.chainIntegrity });

  return (
    <div>
      <PageHeader
        title="IMMUTABLE AUDIT TRAIL"
        subtitle="Append-only, hash-chained ledger of every security-relevant action. Cannot be modified or deleted through the application."
        actions={
          chain && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${chain.intact ? "border-status-success/30 text-status-success bg-status-success/10" : "border-status-critical/30 text-status-critical bg-status-critical/10 animate-pulseAlert"}`}
            >
              {chain.intact ? (
                <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              {chain.intact ? `Chain Verified — ${chain.events_checked} events` : "Chain Integrity FAILED"}
            </motion.div>
          )
        }
      />

      <div className="panel overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : !events || events.length === 0 ? (
          <EmptyState title="No audit events" icon={<ScrollText className="h-5 w-5" />} />
        ) : (
          <div className="max-h-[75vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-base-panel">
                <tr className="border-b border-base-border text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Timestamp</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Actor Role</th>
                  <th className="px-4 py-2.5 font-medium">IP / Device</th>
                  <th className="px-4 py-2.5 font-medium">Event Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-border">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-base-hover">
                    <td className="px-4 py-2.5 text-[11px] text-text-muted">{formatDate(e.timestamp, "dd MMM HH:mm:ss")}</td>
                    <td className="px-4 py-2.5 font-medium text-text-primary">{e.action.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{e.actor_role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-[11px] text-text-muted">{e.ip_address}</td>
                    <td className="px-4 py-2.5 mono text-[10px] text-text-muted">{truncateHash(e.current_event_hash, 14)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
