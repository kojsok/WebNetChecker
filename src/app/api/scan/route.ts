import { NextResponse } from "next/server";
import { scanRequestSchema } from "@/lib/checker/request-schema";
import { normalizeUrl } from "@/lib/checker/normalize-url";
import { streamScan, encodeEvent, summarize } from "@/lib/checker/scan-stream";
import { scanDefaults } from "@/lib/config/env";
import { createMemoryRateLimiter, getClientKey } from "@/lib/rate-limit";
import { getScanCache } from "@/lib/scan-cache-instance";
import type { CheckResult, Target } from "@/types/checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createMemoryRateLimiter(scanDefaults.rateLimit.scans, scanDefaults.rateLimit.windowMs);

function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

function sanitizeName(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : fallback;
}

export async function POST(request: Request): Promise<Response> {
  if (scanDefaults.apiKey) {
    const provided = request.headers.get("x-scan-key");
    if (provided !== scanDefaults.apiKey) {
      return jsonError(401, "unauthorized", "Неверный ключ доступа");
    }
  }

  const clientKey = getClientKey(request);
  const limit = limiter.consume(clientKey);
  if (!limit.allowed) {
    const retryAfter = Math.ceil((limit.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Слишком много сканов. Попробуйте позже." } },
      { status: 429, headers: { "retry-after": String(Math.max(1, retryAfter)) } },
    );
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

  const options = {
    timeoutMs: parsed.data.timeoutMs ?? scanDefaults.timeoutMs,
    retries: parsed.data.retries ?? scanDefaults.retries,
    concurrency: parsed.data.concurrency ?? scanDefaults.concurrency,
  };

  const encoder = new TextEncoder();
  const cache = getScanCache();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const collected: CheckResult[] = [];
      try {
        if (rejected.length > 0) {
          controller.enqueue(encoder.encode(encodeEvent({ type: "error", message: "Часть целей отклонена" })));
        }
        for await (const event of streamScan(targets, options, request.signal)) {
          if (event.type === "result") collected.push(event.result);
          controller.enqueue(encoder.encode(encodeEvent(event)));
        }
        cache.set({
          finishedAt: new Date().toISOString(),
          results: collected,
          summary: summarize(collected),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Неизвестная ошибка скана";
        controller.enqueue(encoder.encode(encodeEvent({ type: "error", message })));
      } finally {
        controller.close();
      }
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