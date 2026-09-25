import { motion } from "framer-motion";
import { ArrowDownCircle } from "lucide-react";
import { CustodyEvent } from "@/types";
import { formatDate, truncateHash } from "@/utils/format";
import { EmptyState } from "@/components/ui/States";

export function CustodyTimeline({ events }: { events: CustodyEvent[] }) {
  if (events.length === 0) {
    return <EmptyState title="No custody events recorded" description="This evidence item has no recorded chain-of-custody events yet." />;
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-base-border" />
      <div className="space-y-5">
        {events.map((event, idx) => (
          <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="relative">
            <div className="absolute -left-6 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-accent bg-base-panel">
              <div className="h-2 w-2 rounded-full bg-accent" />
            </div>
            <div className="panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{event.action.replace(/_/g, " ")}</p>
                <span className="text-[11px] text-text-muted">{formatDate(event.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {event.actor_role.replace(/_/g, " ")} {event.location && `· ${event.location}`}
              </p>
              {event.reason && <p className="mt-1 text-xs text-text-muted">{event.reason}</p>}
              <div className="mt-2 grid grid-cols-1 gap-1 border-t border-base-border pt-2 sm:grid-cols-2">
                <p className="mono text-[10px] text-text-muted">Doc Hash: {truncateHash(event.document_hash, 14)}</p>
                <p className="mono text-[10px] text-text-muted">Event Hash: {truncateHash(event.current_event_hash, 14)}</p>
              </div>
            </div>
            {idx < events.length - 1 && <ArrowDownCircle className="mx-auto mt-1 h-3 w-3 text-base-border" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
