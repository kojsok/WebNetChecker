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

/** Best-effort client IP from proxy headers, falling back to a shared bucket. */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}