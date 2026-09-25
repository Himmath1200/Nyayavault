import { initials } from "@/utils/format";
import { cn } from "@/utils/cn";

export function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" }[size];
  return (
    <div className={cn("flex items-center justify-center rounded-full bg-accent/15 text-accent font-semibold border border-accent/30", dims)}>
      {initials(name)}
    </div>
  );
}
