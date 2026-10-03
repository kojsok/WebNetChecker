import { createMemoryScanCache, type ScanCache } from "@/lib/cache";

const globalForCache = globalThis as unknown as { __wncScanCache?: ScanCache };

export function getScanCache(): ScanCache {
  if (!globalForCache.__wncScanCache) {
    globalForCache.__wncScanCache = createMemoryScanCache(10 * 60_000);
  }
  return globalForCache.__wncScanCache;
}