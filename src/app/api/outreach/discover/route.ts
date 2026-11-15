import { cronAuthorized, json } from "@/lib/outreach/auth";
import { discoverAll } from "@/lib/outreach/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily lead search (Vercel Cron, see vercel.json): runs the active saved searches against
 * OpenStreetMap and adds up to 30 new businesses per day. Auditing happens later, one site per tick.
 * `?search=<id>` runs one search only.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  const search = new URL(req.url).searchParams.get("search") ?? undefined;
  try {
    return json({ results: await discoverAll(search) });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
