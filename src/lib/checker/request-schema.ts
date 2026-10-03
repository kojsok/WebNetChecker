import { z } from "zod";

const targetSchema = z.object({
  id: z.string().max(200).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().min(1).max(2048),
  category: z.string().max(60).optional(),
});

export const scanRequestSchema = z.object({
  targets: z.array(targetSchema).min(1).max(200),
  timeoutMs: z.number().int().min(500).max(30_000).optional(),
  retries: z.number().int().min(0).max(3).optional(),
  concurrency: z.number().int().min(1).max(32).optional(),
});

export type ScanRequestInput = z.infer<typeof scanRequestSchema>;