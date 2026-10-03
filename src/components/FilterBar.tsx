"use client";

import { Search } from "lucide-react";
import { useScanStore, type SortKey, type StatusFilter } from "@/store/scan-store";
import { CATEGORIES } from "@/lib/config/categories";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "available", label: "Доступные" },
  { value: "blocked", label: "Заблокированные" },
  { value: "failed", label: "С ошибкой" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Имя" },
  { value: "latency", label: "Latency" },
  { value: "status", label: "Статус" },
];

const selectClass =
  "border border-steel bg-carbon px-2 py-1.5 font-mono text-[11px] tracking-wide text-silver-bright uppercase transition-colors hover:border-silver/60 focus-visible:border-neon focus-visible:outline-none";

export function FilterBar() {
  const query = useScanStore((s) => s.query);
  const setQuery = useScanStore((s) => s.setQuery);
  const categoryFilter = useScanStore((s) => s.categoryFilter);
  const setCategoryFilter = useScanStore((s) => s.setCategoryFilter);
  const statusFilter = useScanStore((s) => s.statusFilter);
  const setStatusFilter = useScanStore((s) => s.setStatusFilter);
  const sortKey = useScanStore((s) => s.sortKey);
  const setSortKey = useScanStore((s) => s.setSortKey);

  return (
    <div className="flex flex-wrap items-center gap-2 border border-steel bg-carbon/80 p-2 backdrop-blur">
      <label className="flex flex-1 items-center gap-2 border border-steel bg-void px-2 py-1.5 focus-within:border-neon">
        <Search aria-hidden className="size-3.5 shrink-0 text-silver/50" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени или домену…"
          aria-label="Поиск целей"
          className="w-full bg-transparent font-mono text-xs text-silver-bright placeholder:text-silver/40 focus:outline-none"
        />
      </label>

      <label className="sr-only" htmlFor="filter-category">
        Категория
      </label>
      <select
        id="filter-category"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className={selectClass}
      >
        <option value="all">Все категории</option>
        {CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-status">
        Статус
      </label>
      <select
        id="filter-status"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        className={selectClass}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-sort">
        Сортировка
      </label>
      <select
        id="filter-sort"
        value={sortKey}
        onChange={(e) => setSortKey(e.target.value as SortKey)}
        className={selectClass}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}