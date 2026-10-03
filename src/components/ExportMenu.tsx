"use client";

import { useState } from "react";
import { Copy, Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { useScanStore } from "@/store/scan-store";
import { copyToClipboard, downloadFile, timestampSlug, toCsv, toJson, toText, targetsToJson, targetsToCsv, parseTargetsJson, parseTargetsCsv } from "@/lib/export";
import { cn } from "@/lib/cn";

const itemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[11px] tracking-[0.1em] text-silver uppercase transition-colors hover:bg-steel hover:text-neon focus-visible:bg-steel focus-visible:text-neon focus-visible:outline-none";

export function ExportMenu() {
  const targets = useScanStore((s) => s.targets);
  const results = useScanStore((s) => s.results);
  const order = useScanStore((s) => s.order);
  const addTargets = useScanStore((s) => s.addTargets);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const ordered = order.flatMap((key) => {
    const result = results[key];
    return result ? [result] : [];
  });

  const handleCopy = async () => {
    const ok = await copyToClipboard(toText(ordered));
    setCopied(ok);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = file.name.endsWith(".json")
        ? parseTargetsJson(text)
        : parseTargetsCsv(text);
      addTargets(imported);
      setOpen(false);
    } catch (err) {
      alert("Ошибка при импорте файла: " + (err instanceof Error ? err.message : "Неизвестная ошибка"));
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 border border-steel px-3 py-1.5 font-mono text-[11px] tracking-[0.15em] text-silver uppercase transition-colors hover:border-silver/60 hover:text-silver-bright focus-visible:outline-none"
      >
        <Download className="size-3.5" /> Данные
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-64 border border-steel bg-carbon py-1 shadow-[0_8px_24px_-8px_#000]"
        >
          <div className="px-3 py-1 text-[10px] font-mono text-silver/40 uppercase tracking-widest border-b border-steel mb-1">
            Экспорт результатов
          </div>
          {ordered.length > 0 ? (
            <>
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  downloadFile(`results-${timestampSlug()}.json`, toJson(ordered), "application/json");
                  setOpen(false);
                }}
              >
                <FileJson className="size-3.5" /> Результаты JSON
              </button>
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  downloadFile(`results-${timestampSlug()}.csv`, toCsv(ordered), "text/csv");
                  setOpen(false);
                }}
              >
                <FileSpreadsheet className="size-3.5" /> Результаты CSV
              </button>
              <button type="button" role="menuitem" className={itemClass} onClick={() => void handleCopy()}>
                <Copy className="size-3.5" /> {copied ? "Скопировано" : "Копировать текст"}
              </button>
            </>
          ) : (
            <div className="px-3 py-2 text-[10px] font-mono text-silver/40 italic">Нет данных для экспорта</div>
          )}

          <div className="px-3 py-1 text-[10px] font-mono text-silver/40 uppercase tracking-widest border-y border-steel my-1">
            Список целей
          </div>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              downloadFile(`targets-${timestampSlug()}.json`, targetsToJson(targets), "application/json");
              setOpen(false);
            }}
          >
            <FileJson className="size-3.5" /> Экспорт списка JSON
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              downloadFile(`targets-${timestampSlug()}.csv`, targetsToCsv(targets), "text/csv");
              setOpen(false);
            }}
          >
            <FileSpreadsheet className="size-3.5" /> Экспорт списка CSV
          </button>
          <label className={cn(itemClass, "cursor-pointer")}>
            <Upload className="size-3.5" /> Импорт списка
            <input type="file" className="sr-only" accept=".json,.csv" onChange={handleImport} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
