import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { motion } from "framer-motion";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted"
    >
      <div className="relative flex h-10 w-10 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border border-accent/30"
          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
      <p className="text-sm">{label}</p>
    </motion.div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-full bg-base-hover p-3 text-text-muted"
      >
        {icon ?? <Inbox className="h-5 w-5" />}
      </motion.div>
      <div>
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {description && <p className="mt-1 text-xs text-text-muted max-w-sm">{description}</p>}
      </div>
    </motion.div>
  );
}

export function ErrorState({ message = "Something went wrong. Please try again." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -8, 8, -6, 0] }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-full bg-status-critical/10 p-3 text-status-critical"
      >
        <AlertTriangle className="h-5 w-5" />
      </motion.div>
      <p className="text-sm text-status-critical max-w-sm">{message}</p>
    </motion.div>
  );
}
