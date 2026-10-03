import { NextResponse } from "next/server";
import { getScanCache } from "@/lib/scan-cache-instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const cached = getScanCache().get();
  return NextResponse.json({ data: cached });
}