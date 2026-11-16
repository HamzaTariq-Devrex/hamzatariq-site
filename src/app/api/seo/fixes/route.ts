import { cronAuthorized, json } from "@/lib/outreach/auth";
import { db } from "@/lib/seo-center/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fix queue for the scheduled SEO autopilot session (docs/SEO_AUTOPILOT.md), CRON_SECRET bearer.
 * GET: safe fixes (status auto) and approved ones (queued), oldest first; a page with a fix done in
 * the last 28 days is held back so each change can be measured on its own. `?limit=` (max 50).
 * POST {id, status: "done" | "failed", commit?, note?}: done stores the commit and the page's last
 * 28 days as the baseline for "before → after"; failed is retried up to 3 times, then shown as failed.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 20);
  try {
    return json({ fixes: await db.fixQueue(Number.isFinite(limit) ? limit : 20) });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

export async function POST(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  const body = (await req.json().catch(() => null)) as { id?: string; status?: string; commit?: string; note?: string } | null;
  if (!body?.id || !UUID.test(body.id) || (body.status !== "done" && body.status !== "failed")) return json({ error: "Send {id, status: done|failed, commit?, note?}" }, 400);
  if (body.status === "done" && !/^[0-9a-f]{7,40}$/i.test(body.commit ?? "")) return json({ error: "done needs the commit hash" }, 400);
  try {
    return json({ fix: await db.markFix(body.id, body.status, body.commit ?? null, body.note?.slice(0, 2000) ?? null) });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
