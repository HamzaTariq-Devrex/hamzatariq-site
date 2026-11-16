import { cronAuthorized, json } from "@/lib/outreach/auth";
import { discoverRun } from "@/lib/outreach/coverage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily coverage run (Vercel Cron, see vercel.json); the tick continues it every 30 minutes.
 * Niches below today's target search their next cells (niche x city). `?type=<niche>` runs one niche.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  const type = new URL(req.url).searchParams.get("type") ?? undefined;
  try {
    return json({ results: await discoverRun(Date.now() + 50_000, type) });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
