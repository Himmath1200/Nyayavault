import { ReactNode } from "react";
import { cn } from "@/utils/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "critical" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-base-hover text-text-secondary border-base-border",
  accent: "bg-accent/10 text-accent border-accent/30",
  success: "bg-status-success/10 text-status-success border-status-success/30",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/30",
  critical: "bg-status-critical/10 text-status-critical border-status-critical/30",
  info: "bg-status-info/10 text-status-info border-status-info/30",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
