import { ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional action row rendered outside the scrollable area, pinned to the bottom of the
   * dialog — so primary actions (e.g. Download) are never scrolled out of reach on long
   * content. If omitted, the dialog just scrolls normally with a "scroll for more" hint. */
  footer?: ReactNode;
  width?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // The bug this fixes: with no max-height/scroll, a tall dialog (e.g. document details with
  // Evidence DNA + access panel + preview + action buttons) could grow past the viewport with
  // its bottom content completely unreachable — no scrollbar, no way to get to it.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const checkOverflow = () => setShowScrollHint(el.scrollHeight - el.scrollTop - el.clientHeight > 20);
    checkOverflow();
    el.addEventListener("scroll", checkOverflow);
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkOverflow);
      observer.disconnect();
    };
  }, [open, children]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`flex max-h-[85vh] w-full ${width} flex-col panel`}
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header shrink-0">
              <h3 className="text-base font-semibold text-text-primary">{title}</h3>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
              {children}
              <AnimatePresence>
                {showScrollHint && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none sticky inset-x-0 bottom-0 -mx-4 -mb-4 flex justify-center bg-gradient-to-t from-base-panel via-base-panel/90 to-transparent px-4 pb-2 pt-8"
                  >
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                      className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent shadow-lg"
                    >
                      <ChevronDown className="h-3 w-3" /> Scroll for more
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {footer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
                className="relative z-10 shrink-0 border-t border-base-border bg-base-panel px-4 py-3.5 shadow-[0_-10px_20px_-12px_rgba(0,0,0,0.55)]"
              >
                {footer}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-base-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary">
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`rounded-md px-3 py-2 text-sm font-semibold ${danger ? "bg-status-critical/20 text-status-critical border border-status-critical/40" : "bg-accent text-base-bg"}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
