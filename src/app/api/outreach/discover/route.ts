import { cronAuthorized, json } from "@/lib/outreach/auth";
import { discoverRun } from "@/lib/outreach/coverage";
import { discoverTick } from "@/lib/outreach/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scanning (owner, 2026-11-23): Supabase pg_cron job "outreach-discover" every 10 minutes, plus the
 * daily Vercel Cron (vercel.json). Runs only when discoveryPlan says so (150+ new businesses a day,
 * weekends included; next area automatically). `?type=<niche>` searches that niche's next cell.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  const type = new URL(req.url).searchParams.get("type") ?? undefined;
  try {
    return json(type ? { results: await discoverRun(Date.now() + 50_000, type) } : await discoverTick(50_000));
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
