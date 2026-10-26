import { after } from "next/server";
import { SITE } from "@/lib/site";
import { hashIp, rpcClient, serverSecret } from "@/lib/supabase/server";
import { sendOwnerNotification, sendVisitorReply } from "@/lib/leads/email";
import { BUDGETS, EMAIL_PATTERN, LEAD_SOURCES, PROJECT_TYPES, type LeadInput, type LeadSource } from "@/lib/leads/options";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const ALLOWED_ORIGINS = [SITE.url, SITE.url.replace("://", "://www.")];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = /^\/[a-z0-9\-/]{0,100}$/i;
const LIMIT = 5; // leads per IP per hour (per warm instance)

const hits = new Map<string, { start: number; count: number }>();
const limited = (key: string) => {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > 3_600_000) {
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
};

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: NO_STORE });

const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return fail(403, "Forbidden");
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(400, "Invalid request.");
  // Honeypot: real visitors never see or fill this field.
  if (str(body.website, 200)) return Response.json({ ok: true }, { headers: NO_STORE });

  const lead: LeadInput = {
    name: str(body.name, 120),
    email: str(body.email, 254).toLowerCase(),
    projectType: (PROJECT_TYPES as readonly string[]).includes(str(body.projectType, 80)) ? str(body.projectType, 80) : "",
    budget: (BUDGETS as readonly string[]).includes(str(body.budget, 60)) ? str(body.budget, 60) : "",
    message: str(body.message, 4000),
    source: (LEAD_SOURCES as readonly string[]).includes(str(body.source, 20)) ? (str(body.source, 20) as LeadSource) : "page",
    page: PAGE.test(str(body.page, 200)) ? str(body.page, 200) : "",
    session: UUID.test(str(body.session, 36)) ? str(body.session, 36) : null,
  };
  if (!lead.name) return fail(400, "Please enter your name.");
  if (!EMAIL_PATTERN.test(lead.email)) return fail(400, "Please enter a valid email address.");

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(hashIp(ip))) return fail(429, "Too many requests. Please try again later or email me directly.");

  const db = rpcClient();
  if (!db) return fail(503, `The form is not available right now. Please email ${SITE.email}.`);
  const { data: id, error } = await db.rpc("app_create_lead", {
    p_secret: serverSecret(),
    p_name: lead.name,
    p_email: lead.email,
    p_project_type: lead.projectType,
    p_budget: lead.budget,
    p_message: lead.message,
    p_source: lead.source,
    p_page: lead.page,
    // Generated types mark every argument non-null; the function treats a null session as "no chat".
    p_session: lead.session as string,
  });
  if (error || !id) {
    console.error("lead insert failed:", error?.message);
    return fail(500, `Something went wrong. Please email ${SITE.email}.`);
  }

  // Emails go out after the response, so the visitor isn't kept waiting.
  after(async () => {
    const [owner, visitor] = await Promise.allSettled([sendOwnerNotification(lead, id), sendVisitorReply(lead)]);
    if (owner.status === "fulfilled") {
      await db.rpc("app_mark_lead_notified", { p_secret: serverSecret(), p_lead: id });
    } else {
      console.error("lead notification failed:", owner.reason);
    }
    if (visitor.status === "rejected") console.error("lead auto-reply failed:", visitor.reason);
  });

  return Response.json({ ok: true }, { headers: NO_STORE });
}
