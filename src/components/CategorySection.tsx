"use client";

import { createElement } from "react";
import { ServiceCard } from "@/components/ServiceCard";
import { categoryIcon } from "@/lib/category-icons";
import type { FilteredEntry } from "@/hooks/useFilters";

interface Props {
  label: string;
  /** Category id for the header icon; omit for non-category sections. */
  categoryId?: string;
  entries: FilteredEntry[];
  onRetry: (entry: FilteredEntry) => void;
  onTogglePin: (entry: FilteredEntry) => void;
  onRemove?: (entry: FilteredEntry) => void;
  onRemoveEnabled: boolean;
}

export function CategorySection({
  label,
  categoryId,
  entries,
  onRetry,
  onTogglePin,
  onRemove,
  onRemoveEnabled,
}: Props) {
  if (entries.length === 0) return null;

  const icon = categoryIcon(categoryId);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {icon
          ? createElement(icon, { className: "size-4 shrink-0 text-neon", "aria-hidden": true })
          : null}
        <h2 className="font-display text-sm tracking-[0.25em] text-silver-bright uppercase">
          {label}
        </h2>
        <span className="font-mono text-[10px] text-silver/40">{entries.length}</span>
        <span aria-hidden className="h-px flex-1 bg-steel" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map((entry) => (
          <ServiceCard
            key={entry.targetId}
            name={entry.targetName}
            url={entry.targetUrl}
            result={entry.result}
            pinned={entry.pinned}
            onTogglePin={() => onTogglePin(entry)}
            onRetry={() => onRetry(entry)}
            onRemove={onRemoveEnabled && onRemove ? () => onRemove(entry) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
