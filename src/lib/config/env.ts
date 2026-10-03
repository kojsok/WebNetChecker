import { z } from "zod";

const envSchema = z.object({
  CHECK_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(3000),
  SCAN_MAX_TARGETS: z.coerce.number().int().min(1).max(1000).default(200),
  SCAN_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(10),
  RATE_LIMIT_SCANS: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
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
  },
  apiKey: env.SCAN_API_KEY,
} as const;