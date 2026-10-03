"use client";

import { useScanStore } from "@/store/scan-store";
import { useScan } from "@/hooks/useScan";
import { Target } from "@/types/checker";
import { cn } from "@/lib/cn";
import { Play } from "lucide-react";

function ComparisonChart({
  targetA,
  targetB,
  historyA,
  historyB
}: {
  targetA: Target | null;
  targetB: Target | null;
  historyA: number[];
  historyB: number[];
}) {
  if (!targetA || !targetB) {
    return (
      <div className="flex h-64 items-center justify-center border border-steel bg-void text-silver/40 font-mono text-xs italic">
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
    return data.map((v, i) => {
      const x = (i / 9) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <div className="relative w-full bg-carbon border border-steel p-4 overflow-hidden">
      <div className="flex justify-between mb-4 font-mono text-[11px] uppercase tracking-widest">
        <span className="text-neon">{targetA.name}</span>
        <span className="text-silver/40">Latency Trend (last 10 checks)</span>
        <span className="text-silver-bright">{targetB.name}</span>
      </div>
      <div className="relative h-64 w-full bg-void border-b border-l border-steel overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((perc) => (
            <line
              key={perc}
              x1="0" y1={height * perc} x2={width} y2={height * perc}
              stroke="currentColor" className="text-steel" strokeWidth="1" strokeDasharray="4 4"
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
      <div className="flex justify-center gap-6 mt-4 font-mono text-[10px] uppercase">
        <div className="flex items-center gap-2">
          <div className="size-2 bg-neon" /> {targetA.name}
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 bg-ok" /> {targetB.name}
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
    if (targetA && targetB) {
      void start([targetA, targetB]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-steel bg-carbon p-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-sm tracking-[0.2em] text-silver-bright uppercase">Сравнение latency</h2>
          <p className="font-mono text-[10px] text-silver/50 uppercase">Выберите два сервиса для анализа динамики</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runCompareScan}
            disabled={compareIds.length < 2}
            className={cn(
              "inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[11px] uppercase transition-colors",
              compareIds.length === 2
                ? "border-neon text-neon hover:bg-neon hover:text-void"
                : "border-steel text-silver/40 cursor-not-allowed"
            )}
          >
            <Play className="size-3.5" /> Запустить тест
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-2 border border-steel bg-carbon p-3 max-h-[600px] overflow-y-auto">
          <span className="font-mono text-[10px] text-silver/50 uppercase mb-2">Список сервисов</span>
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTarget(t.id)}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-left font-mono text-[11px] transition-colors border border-transparent",
                compareIds.includes(t.id)
                  ? "bg-neon/10 border-neon text-neon"
                  : "text-silver hover:bg-steel hover:text-silver-bright"
              )}
            >
              <span className="truncate">{t.name}</span>
              {compareIds.includes(t.id) && <div className="size-1.5 rounded-full bg-neon" />}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">
          <ComparisonChart
            targetA={targetA}
            targetB={targetB}
            historyA={targetA ? (history[targetA.url] ?? []) : []}
            historyB={targetB ? (history[targetB.url] ?? []) : []}
          />

          {targetA && targetB && (
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-steel bg-carbon p-4 font-mono">
                <div className="text-[10px] text-silver/50 uppercase mb-1">{targetA.name}</div>
                <div className="text-2xl text-neon">
                  {(() => {
                    const h = history[targetA.url];
                    return (h && h.length > 0) ? h[h.length - 1] : "—";
                  })()}
                  <span className="text-xs text-silver/40 ml-1">ms</span>
                </div>
              </div>
              <div className="border border-steel bg-carbon p-4 font-mono">
                <div className="text-[10px] text-silver/50 uppercase mb-1">{targetB.name}</div>
                <div className="text-2xl text-ok">
                  {(() => {
                    const h = history[targetB.url];
                    return (h && h.length > 0) ? h[h.length - 1] : "—";
                  })()}
                  <span className="text-xs text-silver/40 ml-1">ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
