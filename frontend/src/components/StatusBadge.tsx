import { Badge } from "@/components/ui/Badge";

const MAP: Record<string, { tone: "neutral" | "accent" | "success" | "warning" | "critical" | "info"; label?: string }> = {
  ACTIVE: { tone: "success" },
  CLOSED: { tone: "neutral" },
  SUSPENDED: { tone: "warning" },
  LOW: { tone: "neutral" },
  MEDIUM: { tone: "info" },
  HIGH: { tone: "warning" },
  CRITICAL: { tone: "critical" },
  VERIFIED: { tone: "success" },
  UNVERIFIED: { tone: "neutral" },
  FAILED: { tone: "critical" },
  PUBLIC: { tone: "neutral" },
  INTERNAL: { tone: "info" },
  CONFIDENTIAL: { tone: "warning" },
  HIGHLY_CONFIDENTIAL: { tone: "critical" },
  SEALED: { tone: "critical", label: "SEALED" },
  OPEN: { tone: "critical" },
  RESOLVED: { tone: "success" },
  DISMISSED: { tone: "neutral" },
  PENDING: { tone: "warning" },
  APPROVED: { tone: "success" },
  DENIED: { tone: "critical" },
  WITH_INVESTIGATOR: { tone: "info" },
  WITH_FORENSICS: { tone: "accent" },
  IN_TRANSIT: { tone: "warning" },
  WITH_COURT: { tone: "success" },
  ARCHIVED: { tone: "neutral" },
};

export function StatusBadge({ value }: { value: string }) {
  const config = MAP[value] ?? { tone: "neutral" as const };
  return <Badge tone={config.tone}>{(config.label ?? value).replace(/_/g, " ")}</Badge>;
}
