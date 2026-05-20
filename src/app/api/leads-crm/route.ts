import { NextResponse } from "next/server";
import crmCache from "./crm-cache.json";

// CRM status is pre-computed at BUILD time by scripts/fetch-crm.mjs
// (runs via the "prebuild" npm hook on every Vercel deploy — 4x/day).
// Querying KSI live for hundreds of leads timed out / got rate-limited,
// so we serve the pre-built cache instantly here.
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(crmCache);
}
