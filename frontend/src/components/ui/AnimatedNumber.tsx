import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

/** Parses "4,821", "99.98%", "07", 128 etc. into a prefix/number/suffix triple so the numeric
 * part alone can be animated while surrounding formatting (%, commas, leading text) is kept. */
function parseValue(value: string | number) {
  const str = String(value);
  const match = str.match(/^(\D*)([\d,]*\.?\d*)(\D*)$/);
  if (!match || match[2] === "") return { prefix: "", number: 0, suffix: str, decimals: 0, hasCommas: false };
  const [, prefix, numericPart, suffix] = match;
  const hasCommas = numericPart.includes(",");
  const clean = numericPart.replace(/,/g, "");
  const decimals = clean.includes(".") ? clean.split(".")[1].length : 0;
  return { prefix, number: parseFloat(clean) || 0, suffix, decimals, hasCommas };
}

function formatNumber(n: number, decimals: number, hasCommas: boolean) {
  const fixed = n.toFixed(decimals);
  if (!hasCommas) return fixed;
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart ? `${withCommas}.${decPart}` : withCommas;
}

export function AnimatedNumber({ value, className }: { value: string | number; className?: string }) {
  const { prefix, number, suffix, decimals, hasCommas } = parseValue(value);
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => `${prefix}${formatNumber(v, decimals, hasCommas)}${suffix}`);

  useEffect(() => {
    const controls = animate(motionValue, number, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  return <motion.span className={className}>{display}</motion.span>;
}
