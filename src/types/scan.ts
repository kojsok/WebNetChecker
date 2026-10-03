import type { CheckResult } from "./checker";

export type ScanEvent =
  | { type: "start"; total: number; startedAt: string }
  | { type: "result"; result: CheckResult; completed: number; total: number }
  | {
      type: "done";
      total: number;
      completed: number;
      durationMs: number;
      aborted: boolean;
    }
  | { type: "error"; message: string };

export interface ScanRequestTarget {
  id?: string;
  name?: string;
  url: string;
  category?: string;
}

export interface ScanRequestBody {
  targets: ScanRequestTarget[];
  timeoutMs?: number;
  retries?: number;
  concurrency?: number;
}

export interface ScanSummary {
  total: number;
  available: number;
  blocked: number;
  failed: number;
  avgLatencyMs: number | null;
}

export interface CachedScan {
  finishedAt: string;
  results: CheckResult[];
  summary: ScanSummary;
}