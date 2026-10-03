import type { CachedScan } from "@/types/scan";

interface CacheEntry {
  value: CachedScan;
  expiresAt: number;
}

export interface ScanCache {
  get(): CachedScan | null;
  set(value: CachedScan): void;
}

export function createMemoryScanCache(ttlMs: number): ScanCache {
  let entry: CacheEntry | null = null;

  return {
    get(): CachedScan | null {
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        entry = null;
        return null;
      }
      return entry.value;
    },
    set(value: CachedScan): void {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
  };
}