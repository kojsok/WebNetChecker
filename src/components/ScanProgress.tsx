"use client";

import { useScanStore } from "@/store/scan-store";

export function ScanProgress() {
  const isScanning = useScanStore((s) => s.isScanning);
  const completed = useScanStore((s) => s.completed);
  const total = useScanStore((s) => s.total);

  if (total === 0) return null;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-wide uppercase">
        <span className={isScanning ? "text-neon" : "text-silver/60"}>
          {isScanning ? "Сканирование…" : "Скан завершён"}
        </span>
        <span className="text-silver">
          проверено {completed} из {total} · {percent}%
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden bg-steel">
        <div
          className="h-full bg-neon transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
        {isScanning ? (
          <div aria-hidden className="absolute inset-y-0 left-0 w-1/3 animate-scan-sweep bg-neon/30" />
        ) : null}
      </div>
    </div>
  );
}