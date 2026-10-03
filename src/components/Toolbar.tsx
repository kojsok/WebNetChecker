"use client";

import { useState } from "react";
import { Play, Square, Terminal, LayoutGrid, RefreshCw, Plus, Clock } from "lucide-react";
import { useScanStore } from "@/store/scan-store";
import { ExportMenu } from "@/components/ExportMenu";
import { AddTargetDialog } from "@/components/AddTargetDialog";

interface Props {
  onRun: () => void;
  onCancel: () => void;
}

const buttonBase =
  "inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors duration-150 focus-visible:outline-none";

export function Toolbar({ onRun, onCancel }: Props) {
  const isScanning = useScanStore((s) => s.isScanning);
  const mode = useScanStore((s) => s.mode);
  const setMode = useScanStore((s) => s.setMode);
  const autoRefreshMs = useScanStore((s) => s.autoRefreshMs);
  const setAutoRefreshMs = useScanStore((s) => s.setAutoRefreshMs);
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isScanning ? (
        <button
          type="button"
          onClick={onCancel}
          className={`${buttonBase} border-blocked text-blocked hover:bg-blocked hover:text-void`}
        >
          <Square className="size-3.5" /> Остановить
        </button>
      ) : (
        <button
          type="button"
          onClick={onRun}
          className={`${buttonBase} border-neon text-neon hover:bg-neon hover:text-void hover:shadow-[0_0_16px_-2px_#ff5e00]`}
        >
          <Play className="size-3.5" /> Запустить проверку
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowAddDialog(true)}
        className={`${buttonBase} border-silver/30 text-silver hover:border-neon hover:text-neon`}
        aria-label="Добавить цель"
      >
        <Plus className="size-3.5" />
      </button>

      <ExportMenu />

      <div className="flex border border-steel">
        <button
          type="button"
          onClick={() => setMode("cards")}
          aria-pressed={mode === "cards"}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase transition-colors ${
            mode === "cards" ? "bg-steel text-neon" : "text-silver/60 hover:text-silver-bright"
          }`}
        >
          <LayoutGrid className="size-3.5" /> Карточки
        </button>
        <button
          type="button"
          onClick={() => setMode("compare")}
          aria-pressed={mode === "compare"}
          className={`flex items-center gap-1.5 border-l border-steel px-3 py-1.5 font-mono text-[11px] uppercase transition-colors ${
            mode === "compare" ? "bg-steel text-neon" : "text-silver/60 hover:text-silver-bright"
          }`}
        >
          <Clock className="size-3.5" /> Сравнение
        </button>
        <button
          type="button"
          onClick={() => setMode("terminal")}
          aria-pressed={mode === "terminal"}
          className={`flex items-center gap-1.5 border-l border-steel px-3 py-1.5 font-mono text-[11px] uppercase transition-colors ${
            mode === "terminal" ? "bg-steel text-neon" : "text-silver/60 hover:text-silver-bright"
          }`}
        >
          <Terminal className="size-3.5" /> Терминал
        </button>
      </div>

      <label className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] text-silver/50 uppercase">
          <RefreshCw className="size-3" /> Авто
        </span>
        <select
          value={autoRefreshMs}
          onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
          aria-label="Интервал автообновления"
          className="border border-steel bg-carbon px-2 py-1.5 font-mono text-[11px] text-silver-bright uppercase focus-visible:border-neon focus-visible:outline-none"
        >
          <option value={0}>Выкл</option>
          <option value={30000}>30с</option>
          <option value={60000}>1м</option>
          <option value={300000}>5м</option>
        </select>
      </label>

      <AddTargetDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
}