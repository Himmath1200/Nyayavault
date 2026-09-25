import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  trend,
  floatIndex = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "critical" | "success" | "warning";
  trend?: string;
  /** Staggers the idle float so cards bob out of sync with each other, like the login showcase. */
  floatIndex?: number;
}) {
  const toneClasses = {
    default: "text-accent bg-accent/10",
    critical: "text-status-critical bg-status-critical/10",
    success: "text-status-success bg-status-success/10",
    warning: "text-status-warning bg-status-warning/10",
  }[tone];

  return (
    <motion.div
      className="panel relative flex items-start justify-between overflow-hidden p-4"
      animate={{ y: [0, -5, 0] }}
      transition={{ y: { duration: 4.5 + floatIndex * 0.35, repeat: Infinity, ease: "easeInOut", delay: floatIndex * 0.3 } }}
      whileHover={{ y: -8, scale: 1.03, boxShadow: "0 16px 32px -10px rgba(0,0,0,0.45)" }}
    >
      {/* Subtle drifting sheen, ties the card back to the login showcase's ambient glow */}
      <motion.div
        className={cn("pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl", toneClasses)}
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 5 + floatIndex * 0.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative min-w-0">
        <p className="label-caps">{label}</p>
        <AnimatedNumber value={value} className="kpi-value mt-1.5 block leading-none" />
        {trend && <p className="mt-1.5 text-xs text-text-muted">{trend}</p>}
      </div>
      <motion.div
        className={cn("relative shrink-0 rounded-lg p-2.5", toneClasses)}
        animate={{ rotate: [0, 6, 0, -6, 0] }}
        transition={{ duration: 6 + floatIndex * 0.3, repeat: Infinity, ease: "easeInOut", delay: floatIndex * 0.2 }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
    </motion.div>
  );
}
