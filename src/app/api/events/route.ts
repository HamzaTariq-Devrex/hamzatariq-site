import { SITE } from "@/lib/site";
import { TOOLS } from "@/data/tools";
import { hashIp, rpcClient, serverSecret } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Browser events stored for the /admin overview (see src/lib/analytics.ts). Only these names and
// values are accepted, so the table can't be filled with arbitrary data.
const NAMES = ["tool_used", "booking_clicked", "cv_downloaded"];
const TOOL_SLUGS = TOOLS.map((t) => t.slug);
const PAGE = /^\/[a-z0-9\-/]{0,100}$/i;
const ALLOWED_ORIGINS = [SITE.url, SITE.url.replace("://", "://www.")];
const LIMIT = 60; // events per IP per hour (per warm instance)

const hits = new Map<string, { start: number; count: number }>();
const limited = (key: string) => {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > 3_600_000) {
    hits.set(key, { start: now, count: 1 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
};

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) return done();
  const raw = await req.text().catch(() => "");
  if (raw.length > 1000) return done();
  let event: { name?: unknown; page?: unknown; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return done();
  }
  if (typeof event.name !== "string" || !NAMES.includes(event.name)) return done();
  const page = typeof event.page === "string" && PAGE.test(event.page) ? event.page : "";
  const data: Record<string, string> = {};
  if (event.name === "tool_used") {
    const tool = event.data?.tool;
    if (typeof tool !== "string" || !TOOL_SLUGS.includes(tool)) return done();
    data.tool = tool;
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(hashIp(ip))) return done();
  const db = rpcClient();
  if (db) {
    const { error } = await db.rpc("app_log_event", { p_secret: serverSecret(), p_name: event.name, p_page: page, p_session: null as unknown as string, p_data: data });
    if (error) console.error("app_log_event:", error.message);
  }
  return done();
}
