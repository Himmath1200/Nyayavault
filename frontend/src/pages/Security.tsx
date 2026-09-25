import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShieldAlert, Lock, KeyRound, Eye, X } from "lucide-react";
import { securityService } from "@/services/security";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/utils/format";
import { AlertStatus } from "@/types";
import { can, PERMISSIONS } from "@/utils/rbac";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const SEVERITY_TONE = { LOW: "info", MEDIUM: "warning", HIGH: "critical", CRITICAL: "critical" } as const;
const ACTION_LABEL: Record<string, string> = {
  LOCK_SESSION: "Session locked",
  REQUIRE_MFA: "MFA re-verification required",
  DISMISS: "Alert dismissed",
  RESOLVE: "Alert marked reviewed",
};

export default function Security() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [statusFilter, setStatusFilter] = useState<AlertStatus | undefined>("OPEN");

  const { data: alerts, isLoading, isError } = useQuery({
    queryKey: ["security-alerts", statusFilter],
    queryFn: () => securityService.listAlerts(statusFilter),
  });

  async function handleResolve(id: string, action: "LOCK_SESSION" | "REQUIRE_MFA" | "DISMISS" | "RESOLVE") {
    await securityService.resolveAlert(id, action);
    queryClient.invalidateQueries({ queryKey: ["security-alerts"] });
    push({ tone: action === "DISMISS" ? "info" : "success", title: ACTION_LABEL[action] });
  }

  return (
    <div>
      <PageHeader title="SECURITY & ANOMALY DETECTION" subtitle="Behavioural anomaly monitoring across logins, downloads, and access patterns." />

      <div className="mb-4 flex gap-1.5">
        {(["OPEN", "RESOLVED", "DISMISSED"] as AlertStatus[]).map((s) => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${statusFilter === s ? "border-accent/40 bg-accent/10 text-accent" : "border-base-border text-text-secondary"}`}
          >
            {s}
          </motion.button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !alerts || alerts.length === 0 ? (
        <div className="panel">
          <EmptyState title="No alerts in this category" icon={<ShieldAlert className="h-5 w-5" />} />
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.3), duration: 0.3 }}
              whileHover={{ x: 2 }}
              className={`panel p-4 ${alert.severity === "CRITICAL" && alert.status === "OPEN" ? "border-status-critical/40 animate-pulseAlert" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-critical/10 text-status-critical">
                    <ShieldAlert className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">SECURITY ALERT</p>
                      <Badge tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary">{alert.event_summary}</p>
                    <p className="mt-1 text-[11px] text-text-muted">{formatDate(alert.detected_at)} · {alert.ip_address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-status-critical">{alert.risk_score}</p>
                  <p className="text-[10px] text-text-muted">RISK SCORE</p>
                </div>
              </div>

              {alert.reasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {alert.reasons.map((r) => (
                    <Badge key={r} tone="warning">{r}</Badge>
                  ))}
                </div>
              )}

              {alert.status === "OPEN" && can(user?.role, PERMISSIONS.SECURITY_RESOLVE) && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-base-border pt-3">
                  <Button variant="danger" size="sm" onClick={() => handleResolve(alert.id, "LOCK_SESSION")}>
                    <Lock className="h-3.5 w-3.5" /> Lock Session
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleResolve(alert.id, "REQUIRE_MFA")}>
                    <KeyRound className="h-3.5 w-3.5" /> Require MFA
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleResolve(alert.id, "RESOLVE")}>
                    <Eye className="h-3.5 w-3.5" /> Mark Reviewed
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleResolve(alert.id, "DISMISS")}>
                    <X className="h-3.5 w-3.5" /> Dismiss
                  </Button>
                </div>
              )}
              {alert.status !== "OPEN" && alert.resolution_note && (
                <p className="mt-2 text-[11px] text-text-muted border-t border-base-border pt-2">Resolution: {alert.resolution_note}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
