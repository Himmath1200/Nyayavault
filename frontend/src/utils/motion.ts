import { Variants } from "framer-motion";

/** Shared animation primitives so motion feels consistent everywhere instead of every
 * page inventing its own timing/easing. Import these rather than hand-rolling variants. */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE_OUT } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

export function staggerContainer(stagger = 0.05, delayChildren = 0): Variants {
  return { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren } } };
}

/** Per-item delay for plain (non-variant) motion.div lists, clamped so long lists don't take
 * forever to finish revealing. */
export function staggerDelay(index: number, step = 0.035, max = 0.45): number {
  return Math.min(index * step, max);
}

export const hoverLift = {
  whileHover: { y: -3, boxShadow: "0 10px 26px -10px rgba(0,0,0,0.4)" },
  transition: { type: "spring" as const, stiffness: 400, damping: 28 },
};

export const tapScale = { whileTap: { scale: 0.97 } };
