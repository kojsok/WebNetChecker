import { z } from "zod";

/**
 * Runtime schema of a CheckResult crossing a trust boundary (server → client
 * hydrate, imports). Kept loose enough for additive server fields, strict
 * enough that garbage from /latest cannot reach the store.
 */
export const checkResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  url: z.string(),
  host: z.string(),
  status: z.enum(["available", "blocked", "timeout", "dns_error", "ssl_error", "error", "pending"]),
  httpStatus: z.number().int().nullable(),
  latencyMs: z.number().nullable(),
  errorKind: z.enum(["timeout", "dns", "ssl", "connection", "redirect", "unknown"]).nullable(),
  errorMessage: z.string().nullable(),
  serverHeader: z.string().nullable(),
  checkedAt: z.string(),
});

export const cachedScanSchema = z.object({
  finishedAt: z.string(),
  results: z.array(checkResultSchema),
  summary: z
    .object({
      total: z.number(),
      available: z.number(),
      blocked: z.number(),
      failed: z.number(),
      avgLatencyMs: z.number().nullable(),
    })
    .optional(),
});
