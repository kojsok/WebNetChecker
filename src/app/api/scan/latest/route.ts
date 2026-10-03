import { NextResponse } from "next/server";
import { getScanCache } from "@/lib/scan-cache-instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Last completed scan (seed-catalog targets only — custom targets are never
 * cached globally, see scan-handler). no-store: the payload changes per scan
 * and must not be cached by browsers or proxies.
 */
export function GET(): NextResponse {
  const cached = getScanCache().get();
  return NextResponse.json({ data: cached }, { headers: { "cache-control": "no-store" } });
}