import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { notificationsService } from "@/services/notifications";
import { formatRelative } from "@/utils/format";
import { EmptyState } from "@/components/ui/States";
import { NotificationSeverity } from "@/types";

const DOT: Record<NotificationSeverity, string> = {
  CRITICAL: "bg-status-critical",
  WARNING: "bg-status-warning",
  SUCCESS: "bg-status-success",
  INFO: "bg-status-info",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsService.list(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        animate={unreadCount > 0 ? { rotate: [0, -12, 10, -6, 0] } : {}}
        transition={{ duration: 0.5 }}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-text-secondary hover:bg-base-hover hover:text-text-primary"
      >
        <Bell className="h-4 w-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[9px] font-bold text-white"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 panel">
          <div className="panel-header">
            <h4 className="text-sm font-semibold">Notifications</h4>
            <span className="text-[11px] text-text-muted">{unreadCount} unread</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <EmptyState title="No notifications" description="You're all caught up." />
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) {
                      notificationsService.markRead(n.id).then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
                    }
                  }}
                  className="flex w-full items-start gap-2.5 border-b border-base-border px-3 py-2.5 text-left last:border-0 hover:bg-base-hover"
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[n.severity]} ${n.is_read ? "opacity-30" : ""}`} />
                  <div className="min-w-0">
                    <p className={`text-xs ${n.is_read ? "text-text-muted" : "text-text-primary font-medium"}`}>{n.title}</p>
                    {n.message && <p className="mt-0.5 text-[11px] text-text-muted line-clamp-2">{n.message}</p>}
                    <p className="mt-1 text-[10px] text-text-muted">{formatRelative(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
