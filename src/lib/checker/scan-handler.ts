import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { scanRequestSchema } from "@/lib/checker/request-schema";
import { normalizeUrl } from "@/lib/checker/normalize-url";
import { streamScan, encodeEvent, summarize } from "@/lib/checker/scan-stream";
import { scanDefaults } from "@/lib/config/env";
import { createMemoryRateLimiter, getClientKey } from "@/lib/rate-limit";
import { getScanCache } from "@/lib/scan-cache-instance";
import { SEED_TARGETS } from "@/lib/config/services";
import type { CheckResult, Target } from "@/types/checker";

/**
 * Shared implementation of the scan endpoints.
 *
 * - `POST /api/scan` — public entry, optionally protected by SCAN_API_KEY.
 * - `POST /api/scan/run` — same-origin entry for the dashboard UI: the key is
 *   injected server-side and never reaches the browser.
 */

const perClientLimiter = createMemoryRateLimiter(
  scanDefaults.rateLimit.scans,
  scanDefaults.rateLimit.windowMs,
);
const globalLimiter = createMemoryRateLimiter(
  scanDefaults.rateLimit.global,
  scanDefaults.rateLimit.windowMs,
);

/** Normalize seed URLs once: only these results go into the shared cache. */
const SEED_URLS: ReadonlySet<string> = new Set(
  SEED_TARGETS.flatMap((t) => {
    const res = normalizeUrl(t.url);
    return res.ok ? [res.url] : [];
  }),
);

function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Constant-time string comparison: hash both sides first so neither content
 * nor length of the secret leaks through timing.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Same-origin check for the UI entry point: browsers always attach Origin to
 * cross-site POSTs, and a mismatch means the request was forged from another
 * site (CSRF) or is a plain non-browser client that should use /api/scan.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const host = request.headers.get("host");
    if (!host) return false;
    return safeEqual(originHost, host);
  } catch {
    return false;
  }
}

function sanitizeName(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : fallback;
}

export interface ScanHandlerOptions {
  /**
   * True for internal entry points whose authorization already happened
   * (same-origin check for the UI route). False for the public route, which
   * must validate SCAN_API_KEY itself.
   */
  trusted: boolean;
}

export async function handleScanRequest(request: Request, options: ScanHandlerOptions): Promise<Response> {
  if (scanDefaults.apiKey && !options.trusted) {
    const provided = request.headers.get("x-scan-key") ?? "";
    if (!safeEqual(provided, scanDefaults.apiKey)) {
      return jsonError(401, "unauthorized", "Неверный ключ доступа");
    }
  }

  // The public route intentionally accepts non-browser callers (cron, curl):
  // they cannot send a usable Origin. Abuse is bounded by the per-client and
  // global rate limiters below.

  const clientKey = getClientKey(request, { trustProxy: scanDefaults.trustProxy });
  const perClient = perClientLimiter.consume(clientKey);
  if (!perClient.allowed) {
    return tooManyRequests(perClient.resetAt);
  }
  // Reserve bucket: caps the whole process so key rotation cannot scale abuse.
  const global = globalLimiter.consume("global");
  if (!global.allowed) {
    return tooManyRequests(global.resetAt);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Некорректный JSON");
  }

  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "invalid_body", parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const maxTargets = scanDefaults.maxTargets;
  if (parsed.data.targets.length > maxTargets) {
    return jsonError(400, "too_many_targets", `Максимум ${maxTargets} целей за один скан`);
  }

  const seen = new Set<string>();
  const targets: Target[] = [];
  const rejected: Array<{ url: string; reason: string }> = [];

  for (const raw of parsed.data.targets) {
    const normalized = normalizeUrl(raw.url);
    if (!normalized.ok) {
      rejected.push({ url: raw.url, reason: normalized.reason });
      continue;
    }
    if (seen.has(normalized.url)) continue;
    seen.add(normalized.url);
    targets.push({
      id: raw.id ?? normalized.url,
      name: sanitizeName(raw.name, normalized.host),
      url: normalized.url,
      category: raw.category ?? "custom",
      tags: [],
      pinned: false,
    });
  }

  if (targets.length === 0) {
    return jsonError(400, "no_valid_targets", "Нет валидных целей для проверки");
  }

  const options2 = {
    timeoutMs: parsed.data.timeoutMs ?? scanDefaults.timeoutMs,
    retries: parsed.data.retries ?? scanDefaults.retries,
    concurrency: parsed.data.concurrency ?? scanDefaults.concurrency,
  };

  const encoder = new TextEncoder();
  const cache = getScanCache();

  // Flipped by cancel() as soon as the client disconnects: every enqueue/close
  // below is guarded so a mid-stream abort cannot throw.
  let clientGone = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: Uint8Array): void => {
        if (clientGone) return;
        try {
          controller.enqueue(chunk);
        } catch {
          clientGone = true;
        }
      };

      const collected: CheckResult[] = [];
      void (async () => {
        try {
          if (rejected.length > 0) {
            safeEnqueue(encoder.encode(encodeEvent({ type: "error", message: "Часть целей отклонена" })));
          }
          for await (const event of streamScan(targets, options2, request.signal)) {
            if (event.type === "result") collected.push(event.result);
            safeEnqueue(encoder.encode(encodeEvent(event)));
          }
          cacheSeedResults(collected, cache);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Неизвестная ошибка скана";
          safeEnqueue(encoder.encode(encodeEvent({ type: "error", message })));
        } finally {
          if (!clientGone) {
            try {
              controller.close();
            } catch {
              clientGone = true;
            }
          }
        }
      })();
    },
    cancel() {
      clientGone = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function tooManyRequests(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: { code: "rate_limited", message: "Слишком много сканов. Попробуйте позже." } },
    { status: 429, headers: { "retry-after": String(Math.max(1, retryAfter)) } },
  );
}

/**
 * Only seed-catalog results are cached server-side: the /latest endpoint is
 * global per instance, so custom targets would leak one visitor's input to
 * everyone else.
 */
function cacheSeedResults(collected: readonly CheckResult[], cache: ReturnType<typeof getScanCache>): void {
  const seedResults = collected.filter((result) => SEED_URLS.has(result.url));
  if (seedResults.length === 0) return;
  cache.set({
    finishedAt: new Date().toISOString(),
    results: seedResults,
    summary: summarize(seedResults),
  });
}
