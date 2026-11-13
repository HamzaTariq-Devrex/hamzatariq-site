import { SITE } from "@/lib/site";
import type { LeadInput } from "./options";
import { GROUP_LABELS, type AuditResult, type CheckGroup } from "@/lib/audit/types";

// Lead emails via the Resend REST API (server-only, RESEND_API_KEY).
// Visitor emails come from LEAD_FROM_EMAIL (hello@hamzatariq.site, a domain verified in Resend).

const FROM = process.env.LEAD_FROM_EMAIL || "hello@hamzatariq.site";
const NOTIFY_TO = SITE.email;

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const layout = (body: string) => `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e2e8f0;font-size:15px;line-height:1.6">${body}</div>
</body></html>`;

const send = async (payload: { from: string; to: string; reply_to: string; subject: string; html: string; text: string }) => {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Resend ${res.status}: ${data.message ?? "send failed"}`);
  }
};

/** Notification to Hamza. Reply-to is the visitor, so answering the email reaches them directly. */
export const sendOwnerNotification = (lead: LeadInput, id: string, audit: AuditResult | null = null) => {
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["WhatsApp", lead.phone || "-"],
    ["Project", lead.projectType || "-"],
    ["Budget", lead.budget || "-"],
    ["Source", lead.source + (lead.session ? " (chat transcript in admin)" : "")],
    ["Page", lead.page ? `${SITE.url}${lead.page}` : "-"],
    ...(audit ? ([["Audited URL", audit.finalUrl], ["SEO score", `${audit.score}/100`]] as [string, string][]) : []),
  ];
  const adminUrl = `${SITE.url}/admin/leads?lead=${id}`;
  const html = layout(`<p style="margin:0 0 16px;font-size:18px;font-weight:bold">New lead from ${escape(lead.name)}</p>
<table style="border-collapse:collapse;width:100%">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0">${escape(v)}</td></tr>`,
    )
    .join("")}</table>
${lead.message ? `<p style="margin:16px 0 0;padding:14px;background:#f8fafc;border-radius:10px;white-space:pre-wrap">${escape(lead.message)}</p>` : ""}
<p style="margin:20px 0 0"><a href="${adminUrl}" style="color:#d4380d">Open in admin</a> · Reply to this email to answer ${escape(lead.name)}.</p>`);
  const text = [
    `New lead from ${lead.name}`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    lead.message ? `\n${lead.message}` : "",
    `\nAdmin: ${adminUrl}`,
  ].join("\n");
  return send({
    from: `Hamza's AI <${FROM}>`,
    to: NOTIFY_TO,
    reply_to: lead.email,
    subject: audit
      ? `New SEO audit lead: ${lead.name} (${new URL(audit.finalUrl).hostname}, ${audit.score}/100)`
      : `New lead: ${lead.name}${lead.projectType ? ` (${lead.projectType})` : ""}`,
    html,
    text,
  });
};

// " about your ecommerce store project": lowercases only plain words, so "AI", "Next.js" and "React" stay as written.
const projectPhrase = (type: string) => {
  if (!type || type === "Something else") return "";
  const words = type.split(" ");
  if (/^[A-Z][a-z]+$/.test(words[0]) && !["React"].includes(words[0])) words[0] = words[0].toLowerCase();
  return ` about your ${words.join(" ")} project`;
};

/** Automatic reply to the visitor. */
export const sendVisitorReply = (lead: LeadInput) => {
  const first = lead.name.split(/\s+/)[0];
  // Until the booking link exists (OWNER_TODO), WhatsApp is the quickest way to reach Hamza.
  const next = SITE.bookingUrl
    ? { line: "If you'd like to talk sooner, you can book a free call:", label: "Book a free call", url: SITE.bookingUrl }
    : { line: "If it's urgent, you can also reach me on WhatsApp:", label: "Chat on WhatsApp", url: SITE.social.whatsapp };
  const about = projectPhrase(lead.projectType);
  const html = layout(`<p style="margin:0 0 14px">Hi ${escape(first)},</p>
<p style="margin:0 0 14px">Thanks for your message${escape(about)}. I've received your details and I'll reply within 24 hours.</p>
<p style="margin:0 0 20px">${next.line}</p>
<p style="margin:0 0 24px"><a href="${next.url}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0e0e10;color:#ffffff;font-weight:bold;text-decoration:none">${next.label}</a></p>
<p style="margin:0">Hamza Tariq<br><span style="color:#64748b">${escape(SITE.jobTitle)} · <a href="${SITE.url}" style="color:#d4380d">hamzatariq.site</a></span></p>`);
  const text = `Hi ${first},\n\nThanks for your message${about}. I've received your details and I'll reply within 24 hours.\n\n${next.line}\n${next.url}\n\nHamza Tariq\n${SITE.url}`;
  return send({
    from: `Hamza Tariq <${FROM}>`,
    to: lead.email,
    reply_to: SITE.email,
    subject: "Thanks, I got your message",
    html,
    text,
  });
};

const STATUS_STYLE = {
  pass: { label: "Good", color: "#15803d", bg: "#dcfce7" },
  warn: { label: "Improve", color: "#a16207", bg: "#fef9c3" },
  fail: { label: "Fix", color: "#b91c1c", bg: "#fee2e2" },
  skip: { label: "Not measured", color: "#475569", bg: "#f1f5f9" },
} as const;

/** The full SEO audit report, sent to the visitor who asked for it on /tools/free-seo-audit. */
export const sendAuditReport = (lead: LeadInput, audit: AuditResult) => {
  const first = lead.name.split(/\s+/)[0];
  const host = new URL(audit.finalUrl).hostname;
  const order = { fail: 0, warn: 1, skip: 2, pass: 3 };
  const groups = (Object.keys(GROUP_LABELS) as CheckGroup[])
    .map((g) => ({ g, checks: audit.checks.filter((c) => c.group === g).sort((a, b) => order[a.status] - order[b.status]) }))
    .filter((x) => x.checks.length);
  const toFix = audit.checks.filter((c) => c.status === "fail" || c.status === "warn").length;
  const scoreColor = audit.score >= 90 ? "#15803d" : audit.score >= 50 ? "#a16207" : "#b91c1c";
  const speed = audit.pagespeed
    ? [...audit.pagespeed.field.map((m) => ({ ...m, label: `${m.label} (real users)` })), ...audit.pagespeed.lab]
    : [];
  const html = layout(`<p style="margin:0 0 14px">Hi ${escape(first)},</p>
<p style="margin:0 0 18px">Here is the full SEO report for <strong>${escape(host)}</strong>, checked on ${new Date(audit.checkedAt).toUTCString().slice(5, 16)}.</p>
<div style="text-align:center;padding:18px;border-radius:12px;background:#f8fafc;margin:0 0 22px">
<div style="font-size:44px;font-weight:bold;color:${scoreColor};line-height:1">${audit.score}<span style="font-size:18px;color:#64748b">/100</span></div>
<div style="color:#475569;margin-top:6px">${toFix ? `${toFix} thing${toFix > 1 ? "s" : ""} to fix or improve` : "No problems found"}</div>
</div>
${groups
  .map(
    ({ g, checks }) => `<p style="margin:22px 0 8px;font-weight:bold;font-size:16px">${escape(GROUP_LABELS[g])}</p>
${checks
  .map((c) => {
    const st = STATUS_STYLE[c.status];
    return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin:0 0 8px">
<span style="display:inline-block;font-size:12px;font-weight:bold;padding:2px 8px;border-radius:999px;color:${st.color};background:${st.bg}">${st.label}</span>
<strong style="margin-left:6px">${escape(c.label)}</strong>
<div style="color:#475569;margin-top:6px">${escape(c.detail)}</div>
${c.fix ? `<div style="margin-top:6px"><strong>How to fix:</strong> ${escape(c.fix)}</div>` : ""}
</div>`;
  })
  .join("\n")}`,
  )
  .join("\n")}
${speed.length ? `<p style="margin:22px 0 8px;font-weight:bold;font-size:16px">Speed details (mobile)</p>
<table style="border-collapse:collapse;width:100%">${speed
    .map((m) => `<tr><td style="padding:6px 12px 6px 0;color:#475569">${escape(m.label)}</td><td style="padding:6px 0;font-weight:bold;color:${STATUS_STYLE[m.status].color}">${escape(m.value)}</td></tr>`)
    .join("")}</table>` : ""}
<div style="margin:26px 0 0;padding:18px;border-radius:12px;background:#f0fdfa;border:1px solid #99f6e4">
<p style="margin:0 0 8px;font-weight:bold">Want me to fix this?</p>
<p style="margin:0 0 14px">My SEO audit with a full fix plan starts at $150 (2–3 days), and I can also do the fixes for you. Reply to this email or book a free call.</p>
<a href="${SITE.bookingUrl || `${SITE.url}/contact`}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0e0e10;color:#ffffff;font-weight:bold;text-decoration:none">Book a free call</a>
<a href="${SITE.url}/services/react-nextjs-seo" style="margin-left:12px;color:#d4380d">See the SEO service</a>
</div>
<p style="margin:24px 0 0">Hamza Tariq<br><span style="color:#64748b">${escape(SITE.jobTitle)} · <a href="${SITE.url}" style="color:#d4380d">hamzatariq.site</a></span></p>`);
  const text = [
    `Hi ${first},`,
    "",
    `SEO report for ${host}: ${audit.score}/100`,
    ...groups.flatMap(({ g, checks }) => [
      "",
      GROUP_LABELS[g].toUpperCase(),
      ...checks.map((c) => `[${STATUS_STYLE[c.status].label}] ${c.label}: ${c.detail}${c.fix ? `\n  Fix: ${c.fix}` : ""}`),
    ]),
    "",
    "Want me to fix this? SEO audit from $150. Reply to this email or book a free call:",
    SITE.bookingUrl || `${SITE.url}/contact`,
    "",
    "Hamza Tariq",
    SITE.url,
  ].join("\n");
  return send({
    from: `Hamza Tariq <${FROM}>`,
    to: lead.email,
    reply_to: SITE.email,
    subject: `Your SEO report for ${host}: ${audit.score}/100`,
    html,
    text,
  });
};

export type ToolResult = { subject: string; title: string; summary: string; note: string; cta: { label: string; href: string } };

/** Result of a free calculator (website cost, chatbot ROI), sent to the visitor who asked for it. */
export const sendToolResult = (lead: LeadInput, result: ToolResult) => {
  const first = lead.name.split(/\s+/)[0];
  const rows = result.summary.split("\n").map((line) => {
    const i = line.indexOf(": ");
    return i > 0 ? [line.slice(0, i), line.slice(i + 2)] : ["", line];
  });
  const html = layout(`<p style="margin:0 0 14px">Hi ${escape(first)},</p>
<p style="margin:0 0 18px">Here is the estimate you asked for.</p>
<p style="margin:0 0 16px;padding:16px;border-radius:12px;background:#f0fdfa;border:1px solid #99f6e4;font-size:18px;font-weight:bold;color:#0f766e">${escape(result.title)}</p>
<table style="border-collapse:collapse;width:100%">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top">${escape(k)}</td><td style="padding:6px 0">${escape(v)}</td></tr>`)
    .join("")}</table>
<p style="margin:18px 0 20px;color:#475569">${escape(result.note)}</p>
<p style="margin:0 0 24px"><a href="${result.cta.href}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0e0e10;color:#ffffff;font-weight:bold;text-decoration:none">${escape(result.cta.label)}</a></p>
<p style="margin:0">Hamza Tariq<br><span style="color:#64748b">${escape(SITE.jobTitle)} · <a href="${SITE.url}" style="color:#d4380d">hamzatariq.site</a></span></p>`);
  const text = [`Hi ${first},`, "", result.title, "", result.summary, "", result.note, `${result.cta.label}: ${result.cta.href}`, "", "Hamza Tariq", SITE.url].join("\n");
  return send({ from: `Hamza Tariq <${FROM}>`, to: lead.email, reply_to: SITE.email, subject: result.subject, html, text });
};
