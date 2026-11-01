import { SITE } from "@/lib/site";
import { hashIp } from "@/lib/supabase/server";
import { AuditFetchError, normalizeUrl } from "@/lib/audit/safe-fetch";
import { runAudit } from "@/lib/audit/run";
import { auditLimited, cacheKey, getCachedAudit, recordAuditHit, saveAudit } from "@/lib/audit/store";
import type { AuditResponse } from "@/lib/audit/types";

export const runtime = "nodejs";
// PageSpeed Insights alone can take 20-40 s.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };
const ALLOWED_ORIGINS = [SITE.url, SITE.url.replace("://", "://www.")];
const fail = (status: number, error: string) => Response.json({ error }, { status, headers: NO_STORE });

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) return fail(403, "Forbidden");
  const body = (await req.json().catch(() => null)) as { url?: unknown; fresh?: unknown } | null;
  if (!body || typeof body.url !== "string") return fail(400, "Please enter a website address.");

  let url: URL;
  try {
    url = normalizeUrl(body.url);
  } catch (error) {
    return fail(400, error instanceof AuditFetchError ? error.message : "That doesn't look like a website address.");
  }

  const key = cacheKey(url);
  const cached = await getCachedAudit(key);
  if (cached) return Response.json({ id: cached.id, cached: true, result: cached.result } satisfies AuditResponse, { headers: NO_STORE });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ipHash = hashIp(ip);
  if (await auditLimited(ipHash)) {
    return fail(429, "You've run a lot of audits in the last hour. Please try again later, or book a free call and I'll check your site myself.");
  }
  recordAuditHit(ipHash);

  try {
    const result = await runAudit(url);
    const id = await saveAudit(key, result, ipHash);
    return Response.json({ id, cached: false, result } satisfies AuditResponse, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuditFetchError) return fail(422, error.message);
    console.error("audit failed:", error);
    return fail(500, "Something went wrong while checking that site. Please try again.");
  }
}
