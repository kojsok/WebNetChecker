import { NextResponse } from "next/server";
import { handleScanRequest, isSameOrigin } from "@/lib/checker/scan-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UI scan endpoint (same-origin only). The dashboard always calls this route:
 * SCAN_API_KEY is injected server-side here, so enabling the key in production
 * never breaks the browser client. External callers (cron, scripts) must use
 * POST /api/scan with the x-scan-key header instead.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: "forbidden_origin", message: "Запрос разрешён только с самого сайта" } },
      { status: 403 },
    );
  }
  return handleScanRequest(request, { trusted: true });
}