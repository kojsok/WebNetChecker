"use client";

import { RefreshCw, Pin, PinOff } from "lucide-react";
import { useScanStore } from "@/store/scan-store";
import type { CheckResult, CheckStatus } from "@/types/checker";
import { StatusBadge } from "@/components/StatusBadge";
import { formatHttpStatus, formatLatency } from "@/lib/format";
import { cn } from "@/lib/cn";

const STRIP: Record<CheckStatus, string> = {
  available: "bg-ok shadow-[0_0_12px_0_#00ff88]",
  blocked: "bg-blocked shadow-[0_0_12px_0_#ff2244]",
  timeout: "bg-neon shadow-[0_0_12px_0_#ff5e00]",
  dns_error: "bg-neon shadow-[0_0_12px_0_#ff5e00]",
  ssl_error: "bg-neon shadow-[0_0_12px_0_#ff5e00]",
  error: "bg-blocked shadow-[0_0_12px_0_#ff2244]",
  pending: "bg-neon animate-pulse-neon",
};

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        points={points}
        className="text-silver/40"
      />
    </svg>
  );
}

interface Props {
  name: string;
  url: string;
  result: CheckResult | null;
  onRetry?: () => void;
  onRemove?: () => void;
}

export function ServiceCard({ name, url, result, onRetry, onRemove }: Props) {
  const status: CheckStatus = result?.status ?? "pending";
  const { history, togglePin, targets } = useScanStore();
  const target = targets.find((t) => t.url === url);
  const isPinned = target?.pinned ?? false;
  const latencyHistory = history[url] ?? [];

  return (
    <article className="group relative flex items-stretch border border-steel bg-carbon transition-colors hover:border-silver/60">
      <span aria-hidden className={cn("w-1 shrink-0", STRIP[status])} />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-condensed text-sm font-semibold tracking-wide text-silver-bright uppercase">
              {name}
            </h3>
            <p className="truncate font-mono text-[11px] text-silver/70">{url}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        <dl className="flex items-center gap-4 font-mono text-[11px] text-silver">
          <div className="flex items-center gap-1">
            <dt className="text-silver/50">LAT</dt>
            <dd className={cn("flex items-center gap-2", status === "available" && "text-ok", status === "pending" && "text-neon")}>
              {formatLatency(result?.latencyMs ?? null)}
              <Sparkline data={latencyHistory} />
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="text-silver/50">HTTP</dt>
            <dd>{formatHttpStatus(result?.httpStatus ?? null)}</dd>
          </div>
          {result?.errorMessage ? (
            <div className="relative group/tip min-w-0 flex-1 truncate text-right">
              <p className="text-[10px] text-silver/60 cursor-help underline decoration-dotted">
                {result.errorMessage}
              </p>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tip:block z-20 w-max max-w-xs p-2 text-[10px] leading-tight text-silver-bright bg-graphite border border-steel shadow-xl">
                <p className="font-bold text-neon mb-1 uppercase tracking-tighter">Детали ошибки:</p>
                <p>{result.errorMessage}</p>
                {result.serverHeader && (
                  <p className="mt-1 text-silver/60 border-t border-steel pt-1">
                    Server: <span className="font-mono">{result.serverHeader}</span>
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="flex flex-col border-l border-steel">
        <button
          type="button"
          onClick={() => togglePin(target?.id ?? "")}
          aria-label="Закрепить"
          className={cn(
            "flex flex-1 items-center justify-center px-2 transition-colors focus-visible:outline-none",
            isPinned ? "bg-neon/10 text-neon" : "text-silver/50 hover:bg-steel hover:text-neon"
          )}
        >
          {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </button>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            aria-label={`Перепроверить ${name}`}
            className="flex flex-1 items-center justify-center px-2 text-silver/50 transition-colors hover:bg-steel hover:text-neon focus-visible:bg-steel focus-visible:text-neon focus-visible:outline-none"
          >
            <RefreshCw className="size-3.5" />
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Удалить ${name}`}
            className="flex flex-1 items-center justify-center border-t border-steel px-2 text-silver/40 transition-colors hover:bg-blocked/20 hover:text-blocked focus-visible:bg-blocked/20 focus-visible:text-blocked focus-visible:outline-none"
          >
            <span aria-hidden className="font-mono text-xs">
              ×
            </span>
          </button>
        ) : null}
      </div>
    </article>
  );
}
