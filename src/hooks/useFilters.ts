"use client";

import { useMemo } from "react";
import { useScanStore } from "@/store/scan-store";
import { isFailed, isHealthy } from "@/lib/format";
import type { CheckResult } from "@/types/checker";

export interface FilteredEntry {
  targetId: string;
  targetName: string;
  targetCategory: string;
  targetUrl: string;
  result: CheckResult | null;
}

export function useFilters(): FilteredEntry[] {
  const targets = useScanStore((s) => s.targets);
  const results = useScanStore((s) => s.results);
  const query = useScanStore((s) => s.query);
  const categoryFilter = useScanStore((s) => s.categoryFilter);
  const statusFilter = useScanStore((s) => s.statusFilter);
  const sortKey = useScanStore((s) => s.sortKey);
  const tagFilter = useScanStore((s) => s.tagFilter);

  return useMemo(() => {
    const needle = query.trim().toLowerCase();

    const entries: FilteredEntry[] = targets.map((target) => ({
      targetId: target.id,
      targetName: target.name,
      targetCategory: target.category,
      targetUrl: target.url,
      result: results[target.url] ?? null,
    }));

    const filtered = entries.filter((entry) => {
      const target = targets.find((t) => t.id === entry.targetId);
      if (categoryFilter !== "all" && entry.targetCategory !== categoryFilter) return false;

      if (tagFilter && !target?.tags.includes(tagFilter)) return false;

      if (statusFilter !== "all") {
        const status = entry.result?.status;
        if (!status) return false;
        if (statusFilter === "available" && !isHealthy(status)) return false;
        if (statusFilter === "blocked" && status !== "blocked") return false;
        if (statusFilter === "failed" && !isFailed(status)) return false;
      }

      if (needle) {
        const haystack = `${entry.targetName} ${entry.targetUrl} ${target?.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (sortKey === "name") return a.targetName.localeCompare(b.targetName, "ru");
      if (sortKey === "latency") {
        const la = a.result?.latencyMs ?? Number.POSITIVE_INFINITY;
        const lb = b.result?.latencyMs ?? Number.POSITIVE_INFINITY;
        return la - lb;
      }
      const sa = a.result?.status ?? "pending";
      const sb = b.result?.status ?? "pending";
      return sa.localeCompare(sb);
    });

    return filtered;
  }, [targets, results, query, categoryFilter, statusFilter, sortKey]);
}