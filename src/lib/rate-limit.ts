export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  consume(key: string): RateLimitResult;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createMemoryRateLimiter(limit: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  const sweep = (now: number): void => {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  };

  return {
    consume(key: string): RateLimitResult {
      const now = Date.now();
      sweep(now);

      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: limit - 1, resetAt };
      }

      if (existing.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
      }

      existing.count += 1;
      return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
    },
  };
}

export interface ClientKeyOptions {
  /**
   * True only behind a trusted reverse proxy that REPLACES/appends the real
   * client IP to x-forwarded-for. Then the LAST chain entry is the real client.
   */
  trustProxy: boolean;
}

/**
 * Best-effort client key for rate limiting.
 *
 * Trust model:
 * - `trustProxy: true` — the LAST x-forwarded-for entry is authoritative
 *   (nginx `proxy_add_x_forwarded_for` appends the real IP at the end; a
 *   spoofed pre-value is irrelevant because we read the tail).
 * - `trustProxy: false` — proxy headers are fully client-controlled. We still
 *   use the first entry as a best-effort key to isolate casual clients, but a
 *   rotating spoofer defeats it; the global reserve bucket on the scan route
 *   is the actual barrier (see scan-handler).
 */
export function getClientKey(request: Request, options: ClientKeyOptions): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    const key = options.trustProxy ? (parts[parts.length - 1] ?? "") : (parts[0] ?? "");
    if (key) return key;
  }
  if (options.trustProxy) {
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
  return "unknown";
}