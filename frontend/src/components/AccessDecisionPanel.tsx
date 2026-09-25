import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ShieldQuestion, ShieldCheck, ShieldX } from "lucide-react";
import { AccessDecision } from "@/types";

const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const listItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 360, damping: 26 } },
};

export function AccessDecisionPanel({ decision }: { decision: AccessDecision }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-md border border-base-border bg-base-bg/60 p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <ShieldQuestion className="h-4 w-4 text-accent" />
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Why can I access this?</p>
      </div>
      <motion.ul variants={listStagger} initial="hidden" animate="show" className="space-y-1.5">
        {decision.checks.map((check) => (
          <motion.li key={check.label} variants={listItem} className="flex items-start gap-2 text-xs">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-critical" />
            )}
            <span className={check.passed ? "text-text-secondary" : "text-status-critical"}>
              {check.label}
              {check.detail && <span className="text-text-muted"> — {check.detail}</span>}
            </span>
          </motion.li>
        ))}
      </motion.ul>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 + decision.checks.length * 0.06, type: "spring", stiffness: 340, damping: 22 }}
        className={`mt-3 flex items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-center text-xs font-semibold ${
          decision.granted ? "bg-status-success/10 text-status-success ring-1 ring-status-success/20" : "bg-status-critical/10 text-status-critical ring-1 ring-status-critical/20"
        }`}
      >
        {decision.granted ? (
          <motion.span animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> ACCESS GRANTED
          </motion.span>
        ) : (
          <span className="flex items-center gap-1.5">
            <ShieldX className="h-3.5 w-3.5" /> ACCESS DENIED
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
