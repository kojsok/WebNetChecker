import type { CheckStatus } from "@/types/checker";
import { statusLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

const STYLES: Record<CheckStatus, string> = {
  available: "border-ok text-ok shadow-[0_0_10px_-2px_#00ff88]",
  blocked: "border-blocked text-blocked shadow-[0_0_10px_-2px_#ff2244]",
  timeout: "border-neon text-neon shadow-[0_0_10px_-2px_#ff5e00]",
  dns_error: "border-neon text-neon shadow-[0_0_10px_-2px_#ff5e00]",
  ssl_error: "border-neon text-neon shadow-[0_0_10px_-2px_#ff5e00]",
  error: "border-blocked text-blocked shadow-[0_0_10px_-2px_#ff2244]",
  pending: "border-neon text-neon animate-pulse-neon",
};

export function StatusBadge({ status, className }: { status: CheckStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 font-mono text-[10px] tracking-[0.15em] uppercase",
        STYLES[status],
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}