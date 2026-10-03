import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/config/categories";
import { SEED_TARGETS } from "@/lib/config/services";

export const runtime = "nodejs";

export function GET(): NextResponse {
  return NextResponse.json({
    categories: CATEGORIES,
    targets: SEED_TARGETS,
  });
}