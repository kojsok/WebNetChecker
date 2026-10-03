"use client";

import { ServiceCard } from "@/components/ServiceCard";
import type { FilteredEntry } from "@/hooks/useFilters";

interface Props {
  label: string;
  entries: FilteredEntry[];
  onRetry: (entry: FilteredEntry) => void;
  onRemove?: (entry: FilteredEntry) => void;
  onRemoveEnabled: boolean;
}

export function CategorySection({ label, entries, onRetry, onRemove, onRemoveEnabled }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
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
            onRetry={() => onRetry(entry)}
            onRemove={onRemoveEnabled && onRemove ? () => onRemove(entry) : undefined}
          />
        ))}
      </div>
    </section>
  );
}