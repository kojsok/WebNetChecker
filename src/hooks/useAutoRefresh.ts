"use client";

import { useEffect, useRef } from "react";
import { useScanStore } from "@/store/scan-store";
import type { Target } from "@/types/checker";

export function useAutoRefresh(targets: readonly Target[], run: (t: readonly Target[]) => void) {
  const autoRefreshMs = useScanStore((s) => s.autoRefreshMs);
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    if (autoRefreshMs <= 0 || targets.length === 0) return;
    const id = setInterval(() => runRef.current(targets), autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, targets]);
}