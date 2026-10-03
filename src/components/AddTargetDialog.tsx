"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import { useScanStore } from "@/store/scan-store";
import { normalizeUrl } from "@/lib/checker/normalize-url";
import { CLIENT_LIMITS } from "@/lib/config/client-env";
import type { Target } from "@/types/checker";

interface ParsedLine {
  raw: string;
  target: Target | null;
  reason: string | null;
}

function parseLines(text: string): ParsedLine[] {
  const seen = new Set<string>();
  const out: ParsedLine[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [rawName, rawUrl] = splitLine(trimmed);
    const normalized = normalizeUrl(rawUrl);
    if (!normalized.ok) {
      out.push({ raw: trimmed, target: null, reason: normalized.reason });
      continue;
    }
    if (seen.has(normalized.url)) continue;
    seen.add(normalized.url);
    out.push({
      raw: trimmed,
      target: {
        id: `custom:${normalized.url}`,
        name: rawName || normalized.host,
        url: normalized.url,
        category: "custom",
        tags: [],
        pinned: false,
      },
      reason: null,
    });
  }
  return out;
}

function splitLine(line: string): [string, string] {
  const comma = line.indexOf(",");
  if (comma !== -1) {
    return [line.slice(0, comma).trim(), line.slice(comma + 1).trim()];
  }
  return ["", line];
}

const inputClass =
  "w-full border border-steel bg-void px-3 py-2 font-mono text-xs text-silver-bright placeholder:text-silver/40 focus-visible:border-neon focus-visible:outline-none";
const labelClass = "font-mono text-[10px] tracking-[0.2em] text-silver/50 uppercase";

const FOCUSABLE =
  'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])';

export function AddTargetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTargets = useScanStore((s) => s.addTargets);
  const targetCount = useScanStore((s) => s.targets.length);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [bulk, setBulk] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // ARIA-паттерн dialog: Escape, ловушка фокуса, блокировка скролла фона.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const remainingCapacity = Math.max(0, CLIENT_LIMITS.maxTargets - targetCount);

  const submitSingle = () => {
    if (remainingCapacity === 0) {
      setMessage(`Достигнут максимум целей (${CLIENT_LIMITS.maxTargets})`);
      return;
    }
    const normalized = normalizeUrl(url);
    if (!normalized.ok) {
      setMessage(normalized.reason);
      return;
    }
    const target: Target = {
      id: `custom:${normalized.url}`,
      name: name.trim() || normalized.host,
      url: normalized.url,
      category: "custom",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      pinned: false,
    };
    const before = useScanStore.getState().targets.length;
    addTargets([target]);
    const after = useScanStore.getState().targets.length;
    setMessage(after > before ? "Цель добавлена" : "Такая цель уже есть в каталоге");
    setName("");
    setUrl("");
    setTags("");
  };

  const submitBulk = () => {
    const parsed = parseLines(bulk);
    const valid = parsed.flatMap((p) => (p.target ? [p.target] : []));
    if (valid.length === 0) {
      setMessage("Нет валидных целей");
      return;
    }
    if (valid.length > remainingCapacity) {
      setMessage(
        `Максимум ${CLIENT_LIMITS.maxTargets} целей за скан: добавлено ${remainingCapacity} из ${valid.length}, остальные отклонены`,
      );
      addTargets(valid.slice(0, remainingCapacity));
      setBulk("");
      return;
    }
    const invalidCount = parsed.length - valid.length;
    addTargets(valid);
    setBulk("");
    setMessage(
      invalidCount > 0
        ? `Добавлено целей: ${valid.length} · отбраковано строк: ${invalidCount}`
        : `Добавлено целей: ${valid.length}`,
    );
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setBulk((prev) => (prev ? `${prev}\n${text}` : text));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Добавить цели"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto border border-steel bg-carbon p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm tracking-[0.25em] text-silver-bright uppercase">
            Добавить цели
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-silver/50 transition-colors hover:text-blocked focus-visible:text-blocked focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        </div>

        <section className="flex flex-col gap-2">
          <span className={labelClass}>Одна цель</span>
          <input
            className={inputClass}
            placeholder="Имя (необязательно)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Имя цели"
          />
          <input
            className={inputClass}
            placeholder="Теги через запятую (например: #ai, #work)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            aria-label="Теги цели"
          />
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="example.com или https://example.com/file.zip"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-label="URL цели"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSingle();
              }}
            />
            <button
              type="button"
              onClick={submitSingle}
              className="inline-flex shrink-0 items-center gap-2 border border-neon px-3 py-2 font-mono text-[11px] tracking-[0.15em] text-neon uppercase transition-colors hover:bg-neon hover:text-void focus-visible:outline-none"
            >
              <Plus className="size-3.5" /> Добавить
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2 border-t border-steel pt-4">
          <span className={labelClass}>Массово (по строке, формат «имя, url»)</span>
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            placeholder={"GitHub, github.com\nhttps://example.com/file.zip"}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            aria-label="Массовый список целей"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 border border-steel px-3 py-1.5 font-mono text-[11px] tracking-[0.15em] text-silver uppercase transition-colors hover:border-silver/60 focus-within:border-neon">
              <Upload className="size-3.5" /> Загрузить .txt/.csv
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={submitBulk}
              className="inline-flex items-center gap-2 border border-neon px-3 py-2 font-mono text-[11px] tracking-[0.15em] text-neon uppercase transition-colors hover:bg-neon hover:text-void focus-visible:outline-none"
            >
              <Plus className="size-3.5" /> Добавить список
            </button>
          </div>
        </section>

        {message ? <p className="font-mono text-[11px] text-neon">{message}</p> : null}
      </div>
    </div>
  );
}