"use client";

import { useCallback, useState } from "react";
import type { CheckResult } from "@/types/checker";

const STORAGE_KEY = "wnc:history";
const MAX_ENTRIES = 20;

export interface HistoryEntry {
  finishedAt: string;
  results: CheckResult[];
}

function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => readHistory());

  const push = useCallback((results: readonly CheckResult[]) => {
    if (typeof window === "undefined" || results.length === 0) return;
    const entry: HistoryEntry = {
      finishedAt: new Date().toISOString(),
      results: [...results],
    };
    const next = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Переполнение localStorage — не критично.
    }
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setEntries([]);
  }, []);

  return { entries, push, clear };
}