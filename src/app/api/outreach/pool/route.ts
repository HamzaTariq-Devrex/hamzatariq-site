import { cronAuthorized, json } from "@/lib/outreach/auth";
import { ox, type PoolRow } from "@/lib/outreach/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The weekly Geofabrik import (GitHub Actions, scripts/outreach-import.ts) writes the business pool
 * through this route with `Authorization: Bearer $CRON_SECRET` (owner, 2026-11-25), so the workflow
 * needs no Supabase secrets.
 * GET → pool stats. POST { action }:
 * - "upsert" { rows } (at most 1000 per call), "finish" { country, since }
 * - "cache-get" { key, hours } / "cache-put" { key, value }: area shapes from Nominatim only.
 */
const CACHE_KEY = /^nominatim(-shape)?:[A-Z]{2}:[^\n]{1,200}$/;
const COUNTRY = /^(GB|AU|NZ|AE|US|CA)$/;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  try {
    return json(await ox.poolStats());
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

export async function POST(req: Request) {
  if (!cronAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  let body: { action?: string; rows?: PoolRow[]; country?: string; since?: string; key?: string; hours?: number; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }
  try {
    switch (body.action) {
      case "upsert": {
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!rows.length || rows.length > 1000) return json({ error: "1-1000 rows per call" }, 400);
        if (!rows.every((r) => typeof r?.osm_id === "string" && COUNTRY.test(r.country) && typeof r.area_key === "string" && Number.isFinite(r.lat) && Number.isFinite(r.lon)))
          return json({ error: "Bad row" }, 400);
        return json(await ox.poolUpsert(rows));
      }
      case "finish":
        if (!COUNTRY.test(body.country ?? "") || !body.since || !Number.isFinite(Date.parse(body.since))) return json({ error: "Bad country or date" }, 400);
        return json({ gone: await ox.poolFinish(body.country!, body.since) });
      case "cache-get":
        if (!CACHE_KEY.test(body.key ?? "")) return json({ error: "Bad key" }, 400);
        return json({ value: await ox.cacheGet(body.key!, Math.min(Math.max(Number(body.hours) || 1, 1), 24 * 60)) });
      case "cache-put":
        if (!CACHE_KEY.test(body.key ?? "") || body.value == null) return json({ error: "Bad key or value" }, 400);
        await ox.cachePut(body.key!, body.value);
        return json({ ok: true });
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
