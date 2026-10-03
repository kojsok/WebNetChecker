"use client";

import { Radar } from "lucide-react";

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-steel bg-carbon/40 px-6 py-16 text-center">
      <Radar aria-hidden className="size-8 text-neon/70" />
      <p className="font-display text-sm tracking-[0.2em] text-silver-bright uppercase">{message}</p>
      {hint ? <p className="max-w-md font-mono text-xs text-silver/50">{hint}</p> : null}
    </div>
  );
}