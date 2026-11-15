import { cronAuthorized, json } from "@/lib/outreach/auth";
import { PHASES, tick, type Phase } from "@/lib/outreach/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Outreach scheduler tick (GitHub Actions every 5 minutes, see .github/workflows/outreach-tick.yml):
 * hourly inbox check, auto-pause, at most one email, one audit, drafts and follow-ups.
 * `?phases=audit,draft` limits what runs (local tests leave out "send").
 */
async function run(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  const param = new URL(req.url).searchParams.get("phases");
  const phases = param ? (param.split(",").filter((p) => (PHASES as readonly string[]).includes(p)) as Phase[]) : [...PHASES];
  try {
    return json(await tick(phases, 50_000));
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

export const GET = run;
export const POST = run;
