import { cronAuthorized, json } from "@/lib/outreach/auth";
import { STEPS, runSync, type Step } from "@/lib/seo-center/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const parse = (v: string | null) => (v ? (v.split(",").filter((s) => (STEPS as readonly string[]).includes(s)) as Step[]) : undefined);

/**
 * SEO Command Center sync (Supabase pg_cron every hour, job "seo-sync"; CRON_SECRET bearer).
 * Every step runs only when due. `?steps=crawl,analyse` limits the steps, `?force=analyse` runs a
 * step even when it isn't due.
 */
async function run(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  const url = new URL(req.url);
  try {
    return json(await runSync(50_000, parse(url.searchParams.get("steps")), parse(url.searchParams.get("force")) ?? []));
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

export const GET = run;
export const POST = run;
