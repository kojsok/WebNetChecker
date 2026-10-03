"use client";

import { Activity, ShieldAlert, ShieldCheck, Timer } from "lucide-react";
import { useScanStore } from "@/store/scan-store";
import { CATEGORIES } from "@/lib/config/categories";
import { isFailed, isHealthy } from "@/lib/format";
import { cn } from "@/lib/cn";

function Counter({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "ok" | "blocked" | "neon" | "silver";
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "text-ok text-glow-ok"
      : tone === "blocked"
        ? "text-blocked text-glow-blocked"
        : tone === "neon"
          ? "text-neon text-glow-neon"
          : "text-silver-bright";

  return (
    <div className="flex min-w-[7rem] flex-col gap-1 border-l border-steel pl-3">
      <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-silver/50 uppercase">
        {icon}
        {label}
      </span>
      <span className={`font-display text-2xl leading-none tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

export function StatsHeader() {
  const targets = useScanStore((s) => s.targets);
  const results = useScanStore((s) => s.results);
  const order = useScanStore((s) => s.order);

  let available = 0;
  let blocked = 0;
  let failed = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const key of order) {
    const result = results[key];
    if (!result) continue;
    if (isHealthy(result.status)) available += 1;
    else if (result.status === "blocked") blocked += 1;
    else if (isFailed(result.status)) failed += 1;
    if (result.latencyMs !== null) {
      latencySum += result.latencyMs;
      latencyCount += 1;
    }
  }

  const avg = latencyCount > 0 ? Math.round(latencySum / latencyCount) : null;

  const categoryStats = CATEGORIES.map((cat) => {
    const catTargets = targets.filter((t) => t.category === cat.id);
    if (catTargets.length === 0) return null;

    const catAvailable = catTargets.filter((t) => isHealthy(results[t.url]?.status ?? "pending")).length;
    const percent = Math.round((catAvailable / catTargets.length) * 100);

    return { id: cat.id, label: cat.label, percent };
  }).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Counter
          label="Доступно"
          value={String(available)}
          tone="ok"
          icon={<ShieldCheck className="size-3" />}
        />
        <Counter
          label="Заблокировано"
          value={String(blocked)}
          tone="blocked"
          icon={<ShieldAlert className="size-3" />}
        />
        <Counter
          label="Ошибки"
          value={String(failed)}
          tone="neon"
          icon={<Activity className="size-3" />}
        />
        <Counter
          label="Средний latency"
          value={avg === null ? "—" : `${avg}ms`}
          tone="silver"
          icon={<Timer className="size-3" />}
        />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-steel pt-3">
        {categoryStats.map((stat) => (
          <div key={stat!.id} className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-silver/60">
            <span className="uppercase">{stat!.label}:</span>
            <span className={cn(
              stat!.percent === 100 ? "text-ok" : stat!.percent === 0 ? "text-blocked" : "text-neon"
            )}>
              {stat!.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
