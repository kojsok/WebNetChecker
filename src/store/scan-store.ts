"use client";

import { create } from "zustand";
import { SEED_TARGETS } from "@/lib/config/services";
import { normalizeUrl } from "@/lib/checker/normalize-url";
import type { CheckResult, Target } from "@/types/checker";
import type { ScanEvent } from "@/types/scan";
import { terminalLine } from "@/lib/format";

export type ViewMode = "cards" | "terminal" | "compare";
export type SortKey = "name" | "latency" | "status";
export type StatusFilter = "all" | "available" | "blocked" | "failed";

export interface RejectedTarget {
  url: string;
  reason: string;
}

/** Terminal log length cap: the log is a live feed, not an archive. */
const LOG_CAP = 500;

function normalizeTarget(t: Target): Target {
  const res = normalizeUrl(t.url);
  const url = res.ok ? res.url : t.url;
  return { ...t, url, tags: t.tags ?? [], pinned: t.pinned ?? false };
}

function seedTargets(): Target[] {
  return SEED_TARGETS.map((t) => normalizeTarget({ ...t }));
}

export interface ScanState {
  targets: Target[];
  results: Record<string, CheckResult>;
  history: Record<string, number[]>;
  order: string[];
  log: string[];
  isScanning: boolean;
  /** Number of scans in flight (main + isolated retries); drives isScanning. */
  activeScans: number;
  /** URLs of the current main scan: the scope for progress and history. */
  scanUrls: string[];
  completed: number;
  total: number;
  lastRunAt: string | null;
  lastScanAborted: boolean;
  error: string | null;
  rejected: RejectedTarget[] | null;
  mode: ViewMode;
  query: string;
  categoryFilter: string;
  tagFilter: string | null;
  statusFilter: StatusFilter;
  sortKey: SortKey;
  autoRefreshMs: number;
  compareTargets: string[];

  setTargets: (targets: Target[]) => void;
  addTargets: (targets: Target[]) => void;
  removeTarget: (id: string) => void;
  togglePin: (id: string) => void;
  updateTags: (id: string, tags: string[]) => void;
  setCompareTargets: (ids: string[]) => void;
  /** Start of a main scan: resets progress and scopes history to these URLs. */
  beginScan: (total: number, urls: readonly string[]) => void;
  beginIsolatedScan: () => void;
  applyEvent: (event: ScanEvent) => void;
  /** Record a result without touching main-scan progress (isolated retries). */
  applyResult: (result: CheckResult) => void;
  endScan: () => void;
  clearRejected: () => void;
  setMode: (mode: ViewMode) => void;
  setQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setTagFilter: (tag: string | null) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setSortKey: (key: SortKey) => void;
  setAutoRefreshMs: (ms: number) => void;
  hydrateFromCache: (results: CheckResult[], finishedAt: string) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  targets: seedTargets(),
  results: {},
  history: {},
  order: [],
  log: [],
  isScanning: false,
  activeScans: 0,
  scanUrls: [],
  completed: 0,
  total: SEED_TARGETS.length,
  lastRunAt: null,
  lastScanAborted: false,
  error: null,
  rejected: null,
  mode: "cards",
  query: "",
  categoryFilter: "all",
  tagFilter: null,
  statusFilter: "all",
  sortKey: "name",
  autoRefreshMs: 0,
  compareTargets: [],

  setTargets: (targets) => {
    const normalized = targets.map(normalizeTarget);
    set({ targets: normalized, results: {}, history: {}, order: [], log: [], completed: 0, total: normalized.length });
  },

  addTargets: (incoming) =>
    set((state) => {
      const normalizedIncoming = incoming.map(normalizeTarget);

      const existing = new Set(state.targets.map((t) => t.url));
      const merged = [...state.targets];
      for (const target of normalizedIncoming) {
        if (!existing.has(target.url)) {
          merged.push(target);
          existing.add(target.url);
        }
      }
      return { targets: merged, total: merged.length };
    }),

  removeTarget: (id) =>
    set((state) => {
      const target = state.targets.find((t) => t.id === id);
      const targets = state.targets.filter((t) => t.id !== id);
      const results = { ...state.results };
      const order = state.order.filter((key) => key !== id);
      if (target) delete results[target.url];
      return { targets, results, order, total: targets.length };
    }),

  togglePin: (id) =>
    set((state) => ({
      targets: state.targets.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
    })),

  updateTags: (id, tags) =>
    set((state) => ({
      targets: state.targets.map((t) => (t.id === id ? { ...t, tags } : t)),
    })),

  setCompareTargets: (ids) => set({ compareTargets: ids }),

  beginScan: (total, urls) =>
    set({
      isScanning: true,
      activeScans: useScanStore.getState().activeScans + 1,
      scanUrls: [...urls],
      completed: 0,
      total,
      error: null,
      rejected: null,
      lastScanAborted: false,
    }),

  beginIsolatedScan: () =>
    set({
      isScanning: true,
      activeScans: useScanStore.getState().activeScans + 1,
      error: null,
      rejected: null,
    }),

  applyEvent: (event) =>
    set((state) => {
      if (event.type === "start") {
        return { isScanning: true, total: event.total, completed: 0 };
      }
      if (event.type === "result") {
        return reduceResult(state, event.result, event.completed);
      }
      if (event.type === "rejected") {
        return { rejected: event.items };
      }
      if (event.type === "done") {
        return {
          isScanning: state.activeScans > 1,
          completed: event.completed,
          lastRunAt: new Date().toISOString(),
          lastScanAborted: event.aborted,
        };
      }
      return { error: event.message };
    }),

  applyResult: (result) => set((state) => reduceResult(state, result, state.completed)),

  endScan: () =>
    set((state) => {
      const activeScans = Math.max(0, state.activeScans - 1);
      return { activeScans, isScanning: activeScans > 0 };
    }),

  clearRejected: () => set({ rejected: null }),

  setMode: (mode) => set({ mode }),
  setQuery: (query) => set({ query }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setTagFilter: (tagFilter) => set({ tagFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSortKey: (sortKey) => set({ sortKey }),
  setAutoRefreshMs: (autoRefreshMs) => set({ autoRefreshMs }),

  hydrateFromCache: (results, finishedAt) =>
    set(() => {
      const map: Record<string, CheckResult> = {};
      const order: string[] = [];
      const history: Record<string, number[]> = {};
      for (const result of results) {
        map[result.url] = result;
        order.push(result.url);
        if (result.latencyMs !== null) {
          history[result.url] = [result.latencyMs];
        }
      }
      return {
        results: map,
        order,
        history,
        lastRunAt: finishedAt,
        completed: results.length,
        log: results.map(terminalLine),
      };
    }),
}));

function reduceResult(
  state: ScanState,
  result: CheckResult,
  completed: number,
): Partial<ScanState> {
  const results = { ...state.results, [result.url]: result };
  const order = state.order.includes(result.url)
    ? state.order
    : [...state.order, result.url];

  const history = { ...state.history };
  if (result.latencyMs !== null) {
    const h = history[result.url] ?? [];
    history[result.url] = [...h, result.latencyMs].slice(-10);
  }

  return {
    results,
    order,
    history,
    completed,
    log: [...state.log, terminalLine(result)].slice(-LOG_CAP),
  };
}