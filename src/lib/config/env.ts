import { z } from "zod";

/**
 * Strict boolean for env vars: only "1"/"true" (case-insensitive) are truthy.
 * `z.coerce.boolean()` would treat "0"/"false" as true, which is unsafe here.
 */
const booleanFlag = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || String(v).trim().toLowerCase() === "1" || String(v).trim().toLowerCase() === "true");

const envSchema = z.object({
  CHECK_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(3000),
  SCAN_MAX_TARGETS: z.coerce.number().int().min(1).max(1000).default(200),
  SCAN_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(10),
  RATE_LIMIT_SCANS: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  /**
   * Reserve bucket for the whole process: caps total scans per window no matter
   * how client keys rotate (e.g. spoofed X-Forwarded-For on direct deploys).
   */
  RATE_LIMIT_GLOBAL: z.coerce.number().int().min(1).default(60),
  /**
   * Set to 1 when running behind a trusted reverse proxy (nginx, Vercel):
   * client key is then taken from the LAST entry of x-forwarded-for, which the
   * proxy appends. Unset (default): proxy headers are treated as untrusted and
   * the global reserve bucket is the real abuse barrier.
   */
  TRUST_PROXY: booleanFlag.default(false),
  CHECK_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  SCAN_API_KEY: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsed.data;

export const scanDefaults = {
  timeoutMs: env.CHECK_TIMEOUT_MS,
  maxTargets: env.SCAN_MAX_TARGETS,
  concurrency: env.SCAN_CONCURRENCY,
  retries: env.CHECK_RETRIES,
  rateLimit: {
    scans: env.RATE_LIMIT_SCANS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    global: env.RATE_LIMIT_GLOBAL,
  },
  trustProxy: env.TRUST_PROXY,
  apiKey: env.SCAN_API_KEY,
} as const;