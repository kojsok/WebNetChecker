"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { useScanStore } from "@/store/scan-store";
import {
  copyToClipboard,
  downloadFile,
  timestampSlug,
  toCsv,
  toJson,
  toText,
  targetsToJson,
  targetsToCsv,
  parseTargetsJson,
  parseTargetsCsv,
} from "@/lib/export";
import { CLIENT_LIMITS } from "@/lib/config/client-env";
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
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // ARIA-паттерн menu: Escape и клик мимо закрывают, фокус возвращается на кнопку.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

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
    e.target.value = "";
    if (!file) return;

    const text = await file.text();
    const parsed = file.name.endsWith(".json") ? parseTargetsJson(text) : parseTargetsCsv(text);
    if (parsed.fatal) {
      setImportMessage(parsed.fatal);
      return;
    }

    const remainingCapacity = Math.max(0, CLIENT_LIMITS.maxTargets - targets.length);
    const accepted = parsed.targets.slice(0, remainingCapacity);
    const droppedByCap = parsed.targets.length - accepted.length;
    if (accepted.length > 0) addTargets(accepted);

    const parts: string[] = [`добавлено ${accepted.length}`];
    if (parsed.invalid > 0) parts.push(`отбраковано строк: ${parsed.invalid}`);
    if (droppedByCap > 0) parts.push(`сверх лимита ${CLIENT_LIMITS.maxTargets}: ${droppedByCap}`);
    setImportMessage(parts.join(" · "));

    if (accepted.length > 0 && parsed.invalid === 0 && droppedByCap === 0) {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
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
          aria-label="Экспорт и импорт данных"
          className="absolute right-0 z-30 mt-1 w-72 border border-steel bg-carbon py-1 shadow-[0_8px_24px_-8px_#000]"
        >
          <div className="mb-1 border-b border-steel px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-silver/40">
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
            <div className="px-3 py-2 font-mono text-[10px] italic text-silver/40">Нет данных для экспорта</div>
          )}

          <div className="my-1 border-y border-steel px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-silver/40">
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
            <input type="file" className="sr-only" accept=".json,.csv" onChange={(e) => void handleImport(e)} />
          </label>
          {importMessage ? (
            <div className="border-t border-steel px-3 py-2 font-mono text-[10px] normal-case text-neon">
              {importMessage}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}