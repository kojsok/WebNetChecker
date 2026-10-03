import { runPool } from "./pool";
import { checkTarget } from "./fetch-checker";
import type { CheckResult, Target } from "@/types/checker";
import type { ScanEvent } from "@/types/scan";

export interface ScanOptions {
  timeoutMs: number;
  retries: number;
  concurrency: number;
}

export async function* streamScan(
  targets: readonly Target[],
  options: ScanOptions,
  signal: AbortSignal,
): AsyncGenerator<ScanEvent, void, void> {
  yield { type: "start", total: targets.length, startedAt: new Date().toISOString() };

  let completed = 0;
  const startedAt = Date.now();

  for await (const result of runPool(
    targets,
    options.concurrency,
    (target, workerSignal) =>
      checkTarget(target, {
        timeoutMs: options.timeoutMs,
        retries: options.retries,
        signal: workerSignal,
      }),
    signal,
  )) {
    completed += 1;
    yield { type: "result", result, completed, total: targets.length };
  }

  yield {
    type: "done",
    total: targets.length,
    completed,
    durationMs: Date.now() - startedAt,
    aborted: signal.aborted,
  };
}

export function encodeEvent(event: ScanEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function summarize(results: readonly CheckResult[]) {
  let available = 0;
  let blocked = 0;
  let failed = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const result of results) {
    if (result.status === "available") available += 1;
    else if (result.status === "blocked") blocked += 1;
    else failed += 1;

    if (result.latencyMs !== null) {
      latencySum += result.latencyMs;
      latencyCount += 1;
    }
  }

  return {
    total: results.length,
    available,
    blocked,
    failed,
    avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
  };
}