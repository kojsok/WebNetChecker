"use client";

import { useEffect, useRef } from "react";
import { useScanStore } from "@/store/scan-store";

export function TerminalView() {
  const log = useScanStore((s) => s.log);
  const isScanning = useScanStore((s) => s.isScanning);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log.length]);

  return (
    <div className="border border-steel bg-void">
      <div className="flex items-center gap-2 border-b border-steel bg-carbon px-3 py-1.5">
        <span className="size-2 bg-blocked" aria-hidden />
        <span className="size-2 bg-neon" aria-hidden />
        <span className="size-2 bg-ok" aria-hidden />
        <span className="ml-2 font-mono text-[10px] tracking-[0.2em] text-silver/50 uppercase">
          webnetchecker — терминал
        </span>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Журнал проверок"
        className="h-[60vh] overflow-y-auto p-3 font-mono text-xs leading-relaxed text-silver-bright"
      >
        {log.length === 0 ? (
          <p className="text-silver/40">$ ожидание запуска сканирования…</p>
        ) : (
          log.map((line, index) => (
            <p key={index} className="whitespace-pre-wrap break-all">
              <span className="text-neon">$</span> {line}
            </p>
          ))
        )}
        {isScanning ? <span aria-hidden className="inline-block h-4 w-2 animate-pulse bg-neon align-middle" /> : null}
        <div ref={endRef} />
      </div>
    </div>
  );
}