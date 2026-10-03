import { handleScanRequest } from "@/lib/checker/scan-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public scan endpoint. Protect it in production with SCAN_API_KEY
 * (`x-scan-key` header); abuse is additionally bounded by per-client and
 * global rate limiters.
 */
export function POST(request: Request): Promise<Response> {
  return handleScanRequest(request, { trusted: false });
}