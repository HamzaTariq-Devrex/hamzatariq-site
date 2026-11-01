import { after } from "next/server";
import { SITE } from "@/lib/site";
import { hashIp, rpcClient, serverSecret } from "@/lib/supabase/server";
import { sendAuditReport, sendOwnerNotification, sendToolResult, sendVisitorReply, type ToolResult } from "@/lib/leads/email";
import { estimate, isCostInput, summarizeEstimate, usd } from "@/lib/tools/cost";
import { hours, isRoiInput, money, roi, summarizeRoi } from "@/lib/tools/roi";
import { getAuditById } from "@/lib/audit/store";
import { BUDGETS, EMAIL_PATTERN, LEAD_SOURCES, PROJECT_TYPES, isPhone, type LeadInput, type LeadSource } from "@/lib/leads/options";

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
    phone: str(body.phone, 40),
    source: (LEAD_SOURCES as readonly string[]).includes(str(body.source, 40)) ? (str(body.source, 40) as LeadSource) : "page",
    page: PAGE.test(str(body.page, 200)) ? str(body.page, 200) : "",
    session: UUID.test(str(body.session, 36)) ? str(body.session, 36) : null,
    auditId: UUID.test(str(body.auditId, 36)) ? str(body.auditId, 36) : null,
    toolInput: body.toolInput ?? null,
  };
  const audit = lead.source === "seo-audit" && lead.auditId ? await getAuditById(lead.auditId) : null;
  if (lead.source === "seo-audit" && !audit) return fail(400, "That audit has expired. Please run the audit again.");
  if (audit) {
    lead.projectType ||= "React / Next.js SEO";
    lead.message = [`SEO audit: ${audit.finalUrl} (score ${audit.score}/100)`, lead.message].filter(Boolean).join("\n\n");
  }
  // Calculator leads: recompute the result from the inputs; never trust numbers sent by the browser.
  let toolResult: ToolResult | null = null;
  if (lead.source === "website-cost-calculator") {
    if (!isCostInput(lead.toolInput)) return fail(400, "Please run the calculator again.");
    const e = estimate(lead.toolInput);
    toolResult = {
      subject: `Your website estimate: from ${usd(e.from)}`,
      title: `Starting price: from ${usd(e.from)}`,
      summary: summarizeEstimate(lead.toolInput, e),
      note: "This is a starting price based on my published packages. The final quote comes after a short free call.",
      cta: { label: "Book a free call", href: SITE.bookingUrl || `${SITE.url}/contact` },
    };
    lead.projectType ||= lead.toolInput.type === "store" ? "Ecommerce store" : lead.toolInput.type === "website" ? "Next.js website" : "Dashboard or web app";
  } else if (lead.source === "chatbot-roi-calculator") {
    if (!isRoiInput(lead.toolInput)) return fail(400, "Please run the calculator again.");
    const r = roi(lead.toolInput);
    toolResult = {
      subject: `Your chatbot savings estimate: ${money(r.savedPerMonth)}/month`,
      title: `About ${hours(r.hoursPerMonth)} hours and ${money(r.savedPerMonth)} saved per month`,
      summary: summarizeRoi(lead.toolInput, r),
      note: "These numbers come only from what you entered. Want to see an AI chatbot working for your business? Reply to this email.",
      cta: { label: "See the AI chatbot service", href: `${SITE.url}/services/ai-chatbots` },
    };
    lead.projectType ||= "AI chatbot";
  }
  if (toolResult) lead.message = [toolResult.summary, lead.message].filter(Boolean).join("\n\n");
  if (!lead.name) return fail(400, "Please enter your name.");
  if (!EMAIL_PATTERN.test(lead.email)) return fail(400, "Please enter a valid email address.");
  if (lead.phone && !isPhone(lead.phone)) return fail(400, "Please enter a valid WhatsApp number, or leave it empty.");

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(hashIp(ip))) return fail(429, "Too many requests. Please try again later or email me directly.");

  const db = rpcClient();
  if (!db) return fail(503, `The form is not available right now. Please email ${SITE.email}.`);
  const args = {
    p_secret: serverSecret(),
    p_name: lead.name,
    p_email: lead.email,
    p_project_type: lead.projectType,
    p_budget: lead.budget,
    p_message: lead.message,
    p_source: lead.source as string,
    p_page: lead.page,
    // Generated types mark every argument non-null; the function treats a null session as "no chat".
    p_session: lead.session as string,
    p_phone: lead.phone || undefined,
    p_audit: lead.auditId ?? undefined,
  };
  let { data: id, error } = await db.rpc("app_create_lead", args);
  // An audit kept only in memory (database unavailable when it ran) can't be linked; keep the lead anyway.
  if (error && args.p_audit) ({ data: id, error } = await db.rpc("app_create_lead", { ...args, p_audit: undefined }));
  if (error || !id) {
    console.error("lead insert failed:", error?.message);
    return fail(500, `Something went wrong. Please email ${SITE.email}.`);
  }

  // Emails go out after the response, so the visitor isn't kept waiting.
  after(async () => {
    const [owner, visitor] = await Promise.allSettled([
      sendOwnerNotification(lead, id, audit),
      audit ? sendAuditReport(lead, audit) : toolResult ? sendToolResult(lead, toolResult) : sendVisitorReply(lead),
    ]);
    if (owner.status === "fulfilled") {
      await db.rpc("app_mark_lead_notified", { p_secret: serverSecret(), p_lead: id });
    } else {
      console.error("lead notification failed:", owner.reason);
    }
    if (visitor.status === "rejected") console.error("lead auto-reply failed:", visitor.reason);
  });

  return Response.json({ ok: true }, { headers: NO_STORE });
}
