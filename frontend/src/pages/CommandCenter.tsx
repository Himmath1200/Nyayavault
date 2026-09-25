import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Folder, Fingerprint, ShieldCheck, ShieldAlert, FileText, Clock3, Radio } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { dashboardService } from "@/services/dashboard";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { formatRelative } from "@/utils/format";
import { StatusBadge } from "@/components/StatusBadge";

function renderPieValueLabel(props: unknown) {
  const { cx, cy, midAngle, outerRadius, value } = props as { cx: number; cy: number; midAngle: number; outerRadius: number; value: number };
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 16;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#e6edf7" fontSize={11} fontWeight={600} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {value}
    </text>
  );
}

const CHAIN_COLORS: Record<string, string> = {
  WITH_INVESTIGATOR: "#38bdf8",
  WITH_FORENSICS: "#a78bfa",
  IN_TRANSIT: "#fbbf24",
  WITH_COURT: "#34d399",
  SEALED: "#f87171",
  ARCHIVED: "#64759a",
};

const kpiGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const kpiItem = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 18 } },
};

export default function CommandCenter() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({ queryKey: ["dashboard-summary"], queryFn: dashboardService.summary, refetchInterval: 45_000 });

  if (isLoading) return <LoadingState label="Loading command center..." />;
  if (isError || !data) return <ErrorState message="Unable to load dashboard data. Existing case records remain accessible from the sidebar." />;

  const { kpis } = data;

  return (
    <div>
      <PageHeader
        title="COMMAND CENTER"
        subtitle="Real-time overview of cases, evidence integrity, access activity and security events."
        actions={
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-success" />
            </span>
            <Radio className="h-3 w-3" /> Live · updated {formatRelative(new Date(dataUpdatedAt).toISOString())}
          </div>
        }
      />

      <div className="relative">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl"
          animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.06, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div variants={kpiGrid} initial="hidden" animate="show" className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <motion.div variants={kpiItem}>
            <StatCard label="Active Cases" value={kpis.active_cases} icon={Folder} floatIndex={0} />
          </motion.div>
          <motion.div variants={kpiItem}>
            <StatCard label="Evidence Items" value={kpis.evidence_items.toLocaleString()} icon={Fingerprint} floatIndex={1} />
          </motion.div>
          <motion.div variants={kpiItem}>
            <StatCard label="Integrity Verified" value={`${kpis.integrity_verified_pct}%`} icon={ShieldCheck} tone="success" floatIndex={2} />
          </motion.div>
          <motion.div variants={kpiItem}>
            <StatCard label="Security Alerts" value={kpis.security_alerts} icon={ShieldAlert} tone={kpis.security_alerts > 0 ? "critical" : "default"} floatIndex={3} />
          </motion.div>
          <motion.div variants={kpiItem}>
            <StatCard label="Documents Today" value={kpis.documents_today} icon={FileText} floatIndex={4} />
          </motion.div>
          <motion.div variants={kpiItem}>
            <StatCard label="Pending Verification" value={kpis.pending_verification} icon={Clock3} tone={kpis.pending_verification > 0 ? "warning" : "default"} floatIndex={5} />
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }} className="lg:col-span-2">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="panel p-4"
        >
          <p className="label-caps mb-3">Case &amp; Audit Activity — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.case_activity}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#22304a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#64759a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64759a" fontSize={11} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: "#111a2c", border: "1px solid #22304a", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e6edf7" }}
                itemStyle={{ color: "#e6edf7" }}
              />
              <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} fill="url(#activityFill)" isAnimationActive animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.35 }}>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="panel relative overflow-hidden p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            transition={{
              opacity: { delay: 1, duration: 0.35 },
              scale: { delay: 1, duration: 0.35 },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 },
            }}
            className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-status-success/30 bg-status-success/10 px-2 py-1 text-[10px] font-semibold text-status-success"
          >
            <ShieldCheck className="h-3 w-3" /> CHAIN VERIFIED
          </motion.div>
          <p className="label-caps mb-3">Evidence Chain Status</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 20, bottom: 20, left: 30, right: 30 }}>
              <Pie
                data={data.evidence_chain_status}
                dataKey="count"
                nameKey="status"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={2}
                label={renderPieValueLabel}
                labelLine={{ stroke: "#64759a", strokeWidth: 1 }}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              >
                {data.evidence_chain_status.map((entry) => (
                  <Cell key={entry.status} fill={CHAIN_COLORS[entry.status] ?? "#64759a"} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#111a2c", border: "1px solid #22304a", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e6edf7" }}
                itemStyle={{ color: "#e6edf7" }}
                formatter={(value: number, _name, entry) => [value, String((entry?.payload as { status?: string })?.status ?? "").replace(/_/g, " ")]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5 border-t border-base-border pt-3">
            {data.evidence_chain_status.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHAIN_COLORS[entry.status] ?? "#64759a" }} />
                  <span className="truncate text-text-secondary">{entry.status.replace(/_/g, " ")}</span>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-text-primary">{entry.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}>
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="mt-4 panel"
      >
        <div className="panel-header">
          <p className="text-sm font-semibold text-text-primary">Recent Case Events</p>
        </div>
        <div className="divide-y divide-base-border">
          {data.recent_events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + idx * 0.03, duration: 0.25 }}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-base-hover"
            >
              <div className="flex items-center gap-3">
                <StatusBadge value={event.action.includes("FAILED") || event.action.includes("DENIED") ? "FAILED" : event.action.includes("ALERT") ? "HIGH" : "VERIFIED"} />
                <div>
                  <p className="text-xs font-medium text-text-primary">{event.action.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-text-muted">{event.actor_role.replace(/_/g, " ")}</p>
                </div>
              </div>
              <span className="text-[11px] text-text-muted">{formatRelative(event.timestamp)}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
}
