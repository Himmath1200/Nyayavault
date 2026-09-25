import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Folder,
  Vault,
  Fingerprint,
  ShieldAlert,
  ScrollText,
  Settings,
  ShieldCheck,
  Lock,
  Activity,
  Hash,
} from "lucide-react";

const SIDEBAR_ICONS = [LayoutDashboard, Folder, Vault, Fingerprint, ShieldAlert, ScrollText, Settings];

const MINI_STATS = [
  { label: "Active Cases", value: "128", tone: "text-accent bg-accent/15" },
  { label: "Integrity", value: "99.98%", tone: "text-status-success bg-status-success/15" },
  { label: "Alerts", value: "07", tone: "text-status-critical bg-status-critical/15" },
];

const CHART_BARS = [40, 65, 45, 80, 55, 90, 70, 60, 85, 50];

const ACTIVITY_ROWS = [
  { tone: "bg-status-success", w: "w-4/5" },
  { tone: "bg-accent", w: "w-3/5" },
  { tone: "bg-status-warning", w: "w-2/3" },
];

/**
 * Purely decorative "product preview" for the login screen — a floating, tilted mockup of the
 * Command Center (mini sidebar + stat cards + chart + activity feed) surrounded by independently
 * floating trust badges. Built from the app's real design tokens/icons rather than a static
 * image, so it stays visually consistent with the actual product and needs no external asset.
 */
export function LoginShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
      {/* Ambient glow behind the mockup */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main dashboard mockup — one-time entrance, then continuous float */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [-2.5, -0.5, -2.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="relative overflow-hidden rounded-2xl border border-base-border bg-base-panel shadow-2xl"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 border-b border-base-border px-3.5 py-2.5">
            <span className="h-2 w-2 rounded-full bg-status-critical/60" />
            <span className="h-2 w-2 rounded-full bg-status-warning/60" />
            <span className="h-2 w-2 rounded-full bg-status-success/60" />
            <div className="ml-2 flex-1 rounded bg-base-bg px-2.5 py-1 text-[9px] text-text-muted">nyayavault.app/command-center</div>
          </div>

          <div className="flex">
            {/* Mini sidebar */}
            <div className="flex w-11 shrink-0 flex-col items-center gap-2.5 border-r border-base-border bg-base-bg/50 py-3">
              {SIDEBAR_ICONS.map((Icon, i) => (
                <div
                  key={i}
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    i === 0 ? "bg-accent/20 text-accent" : "text-text-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              ))}
            </div>

            {/* Mini content */}
            <div className="flex-1 space-y-3 p-3.5">
              <div className="flex items-center justify-between">
                <div className="h-2 w-20 rounded bg-base-hover" />
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-success" />
                  </span>
                  <div className="h-2 w-10 rounded bg-base-hover" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MINI_STATS.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2.6 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
                    className="rounded-lg border border-base-border bg-base-bg/60 p-2"
                  >
                    <div className={`mb-1.5 inline-flex rounded p-1 ${stat.tone}`}>
                      <Activity className="h-2.5 w-2.5" />
                    </div>
                    <p className="text-sm font-bold text-text-primary">{stat.value}</p>
                    <p className="truncate text-[8px] uppercase tracking-wide text-text-muted">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="rounded-lg border border-base-border bg-base-bg/60 p-2.5">
                <div className="flex h-14 items-end gap-1">
                  {CHART_BARS.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.6 + i * 0.05, duration: 0.4, ease: "easeOut" }}
                      style={{ height: `${h}%`, transformOrigin: "bottom" }}
                      className="flex-1 rounded-sm bg-gradient-to-t from-accent/70 to-accent/20"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border border-base-border bg-base-bg/60 p-2.5">
                {ACTIVITY_ROWS.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.tone}`} />
                    <div className={`h-1.5 ${row.w} rounded bg-base-hover`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating trust badges around the mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { delay: 0.9, duration: 0.4 },
            scale: { delay: 0.9, duration: 0.4 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.9 },
          }}
          className="absolute -right-6 -top-6 flex items-center gap-1.5 rounded-lg border border-status-success/30 bg-base-panel px-3 py-2 shadow-xl"
        >
          <ShieldCheck className="h-4 w-4 text-status-success" />
          <span className="text-[11px] font-semibold text-status-success">VERIFIED</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, y: [0, 10, 0], rotate: [0, 2, 0] }}
          transition={{
            opacity: { delay: 1.05, duration: 0.4 },
            scale: { delay: 1.05, duration: 0.4 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.05 },
            rotate: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.05 },
          }}
          className="absolute -bottom-5 -left-8 flex items-center gap-1.5 rounded-lg border border-accent/30 bg-base-panel px-3 py-2 shadow-xl"
        >
          <Hash className="h-3.5 w-3.5 text-accent" />
          <span className="mono text-[10px] text-accent">7f82a1d9...</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: [0, -8, 0] }}
          transition={{
            opacity: { delay: 1.2, duration: 0.4 },
            scale: { delay: 1.2, duration: 0.4 },
            rotate: { delay: 1.2, duration: 0.4 },
            y: { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 },
          }}
          className="absolute -left-5 top-8 flex h-10 w-10 items-center justify-center rounded-full border border-base-border bg-base-panel text-accent shadow-xl"
        >
          <Lock className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </div>
  );
}
