"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useScanStore } from "@/store/scan-store";
import { useScan } from "@/hooks/useScan";
import { useFilters, type FilteredEntry } from "@/hooks/useFilters";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useHistory } from "@/hooks/useHistory";
import { StatsHeader } from "@/components/StatsHeader";
import { Toolbar } from "@/components/Toolbar";
import { FilterBar } from "@/components/FilterBar";
import { ScanProgress } from "@/components/ScanProgress";
import { TerminalView } from "@/components/TerminalView";
import { CategorySection } from "@/components/CategorySection";
import { EmptyState } from "@/components/EmptyState";
import { ComparisonView } from "@/components/ComparisonView";
import { CATEGORIES, getCategory } from "@/lib/config/categories";

export default function HomePage() {
  const targets = useScanStore((s) => s.targets);
  const mode = useScanStore((s) => s.mode);
  const isScanning = useScanStore((s) => s.isScanning);
  const removeTarget = useScanStore((s) => s.removeTarget);
  const hydrateFromCache = useScanStore((s) => s.hydrateFromCache);
  const error = useScanStore((s) => s.error);

  const { start, cancel } = useScan();
  const entries = useFilters();
  const { push: pushHistory } = useHistory();

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const response = await fetch("/api/scan/latest");
        if (!response.ok) return;
        const body = (await response.json()) as { data: { results: unknown; finishedAt: string } | null };
        if (cancelled || !body.data) return;
        hydrateFromCache(body.data.results as never, body.data.finishedAt);
      } catch {
        // Кэша ещё нет.
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromCache]);

  const runAll = useCallback(() => {
    void start(useScanStore.getState().targets);
  }, [start]);

  useAutoRefresh(targets, runAll);

  useEffect(() => {
    if (!isScanning) return;
    let wasScanning = true;
    const check = () => {
      const results = useScanStore.getState().results;
      const order = useScanStore.getState().order;
      if (wasScanning && !useScanStore.getState().isScanning && order.length > 0) {
        const finishedResults = order.map((key) => results[key]).filter((r): r is NonNullable<typeof r> => !!r);
        if (finishedResults.length > 0) {
          pushHistory(finishedResults);
        }
      }
      wasScanning = useScanStore.getState().isScanning;
    };
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [isScanning, pushHistory]);

  const grouped = useMemo(() => {
    const map = new Map<string, FilteredEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.targetCategory);
      if (list) list.push(entry);
      else map.set(entry.targetCategory, [entry]);
    }
    const ordered: { id: string; label: string; items: FilteredEntry[] }[] = [];
    for (const category of CATEGORIES) {
      const items = map.get(category.id);
      if (items && items.length > 0) {
        ordered.push({ id: category.id, label: category.label, items });
      }
      map.delete(category.id);
    }
    for (const [id, items] of map) {
      ordered.push({ id, label: getCategory(id)?.label ?? id, items });
    }
    return ordered;
  }, [entries]);

  const pinnedEntries = useMemo(() => {
    return entries.filter((entry) => {
      const target = useScanStore.getState().targets.find((t) => t.id === entry.targetId);
      return target?.pinned;
    });
  }, [entries]);

  const retryOne = useCallback(
    (entry: FilteredEntry) => {
      const target = useScanStore.getState().targets.find((t) => t.id === entry.targetId);
      if (target) void start([target]);
    },
    [start],
  );

  const removeOne = useCallback(
    (entry: FilteredEntry) => {
      removeTarget(entry.targetId);
    },
    [removeTarget],
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 px-3 py-4 sm:px-5 sm:py-6">
      <header className="flex flex-col gap-4 border border-steel bg-carbon p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl tracking-[0.2em] text-silver-bright uppercase">
            WebNet<span className="text-neon">Checker</span>
          </h1>
          <StatsHeader />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Toolbar onRun={runAll} onCancel={cancel} />
          {error ? <p className="font-mono text-[11px] text-blocked">{error}</p> : null}
        </div>
      </header>

      <div className="sticky top-0 z-10">
        <FilterBar />
      </div>

      <ScanProgress />

      {mode === "terminal" ? (
        <TerminalView />
      ) : mode === "compare" ? (
        <ComparisonView />
      ) : targets.length === 0 ? (
        <EmptyState
          message="Нет целей для проверки"
          hint="Загрузка каталога сервисов… если это сообщение не исчезает, обновите страницу."
        />
      ) : entries.length === 0 ? (
        <EmptyState message="Ничего не найдено" hint="Измените фильтры или поисковый запрос." />
      ) : (
        <div className="flex flex-col gap-6">
          {pinnedEntries.length > 0 && (
            <CategorySection
              label="Закрепленные"
              entries={pinnedEntries}
              onRetry={retryOne}
              onRemove={removeOne}
              onRemoveEnabled={false}
            />
          )}
          {grouped.map((group) => (
            <CategorySection
              key={group.id}
              label={group.label}
              entries={group.items}
              onRetry={retryOne}
              onRemove={removeOne}
              onRemoveEnabled={group.id === "custom"}
            />
          ))}
        </div>
      )}

      <footer className="mt-auto flex items-center justify-between border-t border-steel pt-3 font-mono text-[10px] tracking-wide text-silver/40 uppercase">
        <span>WebNetChecker · панель мониторинга доступности</span>
        <span>{targets.length} целей в каталоге</span>
      </footer>
    </div>
  );
}