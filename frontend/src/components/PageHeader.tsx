import { ReactNode } from "react";
import { motion } from "framer-motion";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <motion.h1
          initial={{ opacity: 0, scale: 0.85, x: -14 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="origin-left text-2xl font-extrabold tracking-tight text-text-primary sm:text-[28px]"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.3 }}
            className="mt-1 text-sm text-text-secondary max-w-2xl"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="flex items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
    </div>
  );
}
