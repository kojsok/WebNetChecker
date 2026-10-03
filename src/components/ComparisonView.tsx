"use client";

import { useScanStore } from "@/store/scan-store";
import { BrandLogo } from "@/components/BrandLogo";
import { hostFromUrl } from "@/lib/brand-logo";
import { useScan } from "@/hooks/useScan";
import type { Target } from "@/types/checker";
import { cn } from "@/lib/cn";
import { Play } from "lucide-react";

function ComparisonChart({
  targetA,
  targetB,
  historyA,
  historyB,
}: {
  targetA: Target | null;
  targetB: Target | null;
  historyA: number[];
  historyB: number[];
}) {
  if (!targetA || !targetB) {
    return (
      <div className="border-steel bg-void text-silver/40 flex h-64 items-center justify-center border font-mono text-xs italic">
        Выберите два сервиса для сравнения
      </div>
    );
  }

  const allValues = [...historyA, ...historyB];
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 100);
  const range = max - min || 1;
  const width = 800;
  const height = 200;

  const getPoints = (data: number[]) => {
    return data
      .map((v, i) => {
        const x = (i / 9) * width;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");
  };

  return (
    <div className="bg-carbon border-steel relative w-full overflow-hidden border p-4">
      <div className="mb-4 flex justify-between font-mono text-[11px] tracking-widest uppercase">
        <span className="text-neon">{targetA.name}</span>
        <span className="text-silver/40">Latency Trend (last 10 checks)</span>
        <span className="text-silver-bright">{targetB.name}</span>
      </div>
      <div className="bg-void border-steel relative h-64 w-full overflow-hidden border-b border-l">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((perc) => (
            <line
              key={perc}
              x1="0"
              y1={height * perc}
              x2={width}
              y2={height * perc}
              stroke="currentColor"
              className="text-steel"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Target A Line */}
          <polyline
            fill="none"
            stroke="#ff5e00"
            strokeWidth="3"
            strokeLinejoin="round"
            points={getPoints(historyA)}
            className="drop-shadow-[0_0_8px_#ff5e00]"
          />

          {/* Target B Line */}
          <polyline
            fill="none"
            stroke="#00ff88"
            strokeWidth="3"
            strokeLinejoin="round"
            points={getPoints(historyB)}
            className="drop-shadow-[0_0_8px_#00ff88]"
          />
        </svg>
      </div>
      <div className="mt-4 flex justify-center gap-6 font-mono text-[10px] uppercase">
        <div className="flex items-center gap-2">
          <div className="bg-neon size-2" /> {targetA.name}
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-ok size-2" /> {targetB.name}
        </div>
      </div>
    </div>
  );
}

export function ComparisonView() {
  const targets = useScanStore((s) => s.targets);
  const compareIds = useScanStore((s) => s.compareTargets);
  const setCompareTargets = useScanStore((s) => s.setCompareTargets);
  const history = useScanStore((s) => s.history);
  const { start } = useScan();

  const targetA = targets.find((t) => t.id === compareIds[0]) || null;
  const targetB = targets.find((t) => t.id === compareIds[1]) || null;

  const toggleTarget = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareTargets(compareIds.filter((cid) => cid !== id));
    } else if (compareIds.length < 2) {
      setCompareTargets([...compareIds, id]);
    }
  };

  const runCompareScan = () => {
    // Изолированный мини-скан: не прерывает общий скан и не сбрасывает прогресс.
    if (targetA && targetB) {
      void start([targetA, targetB], { isolated: true });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-steel bg-carbon flex flex-wrap items-center justify-between gap-4 border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-silver-bright text-sm tracking-[0.2em] uppercase">
            Сравнение latency
          </h2>
          <p className="text-silver/50 font-mono text-[10px] uppercase">
            Выберите два сервиса для анализа динамики
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runCompareScan}
            disabled={compareIds.length < 2}
            className={cn(
              "inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[11px] uppercase transition-colors",
              compareIds.length === 2
                ? "border-neon text-neon hover:bg-neon hover:text-void"
                : "border-steel text-silver/40 cursor-not-allowed",
            )}
          >
            <Play className="size-3.5" /> Запустить тест
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="border-steel bg-carbon flex max-h-[600px] flex-col gap-2 overflow-y-auto border p-3 lg:col-span-1">
          <span className="text-silver/50 mb-2 font-mono text-[10px] uppercase">
            Список сервисов
          </span>
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTarget(t.id)}
              className={cn(
                "flex items-center justify-between border border-transparent px-3 py-2 text-left font-mono text-[11px] transition-colors",
                compareIds.includes(t.id)
                  ? "bg-neon/10 border-neon text-neon"
                  : "text-silver hover:bg-steel hover:text-silver-bright",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <BrandLogo host={hostFromUrl(t.url)} name={t.name} size={16} decorative />
                <span className="truncate">{t.name}</span>
              </span>
              {compareIds.includes(t.id) && (
                <div className="bg-neon size-1.5 shrink-0 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-3">
          <ComparisonChart
            targetA={targetA}
            targetB={targetB}
            historyA={targetA ? (history[targetA.url] ?? []) : []}
            historyB={targetB ? (history[targetB.url] ?? []) : []}
          />

          {targetA && targetB && (
            <div className="grid grid-cols-2 gap-4">
              <div className="border-steel bg-carbon border p-4 font-mono">
                <div className="text-silver/50 mb-1 text-[10px] uppercase">{targetA.name}</div>
                <div className="text-neon text-2xl">
                  {(() => {
                    const h = history[targetA.url];
                    return h && h.length > 0 ? h[h.length - 1] : "—";
                  })()}
                  <span className="text-silver/40 ml-1 text-xs">ms</span>
                </div>
              </div>
              <div className="border-steel bg-carbon border p-4 font-mono">
                <div className="text-silver/50 mb-1 text-[10px] uppercase">{targetB.name}</div>
                <div className="text-ok text-2xl">
                  {(() => {
                    const h = history[targetB.url];
                    return h && h.length > 0 ? h[h.length - 1] : "—";
                  })()}
                  <span className="text-silver/40 ml-1 text-xs">ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
