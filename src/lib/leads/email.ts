import { SITE } from "@/lib/site";
import type { LeadInput } from "./options";

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
export const sendOwnerNotification = (lead: LeadInput, id: string) => {
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["WhatsApp", lead.phone || "-"],
    ["Project", lead.projectType || "-"],
    ["Budget", lead.budget || "-"],
    ["Source", lead.source + (lead.session ? " (chat transcript in admin)" : "")],
    ["Page", lead.page ? `${SITE.url}${lead.page}` : "-"],
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
<p style="margin:20px 0 0"><a href="${adminUrl}" style="color:#0d9488">Open in admin</a> · Reply to this email to answer ${escape(lead.name)}.</p>`);
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
    subject: `New lead: ${lead.name}${lead.projectType ? ` (${lead.projectType})` : ""}`,
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
<p style="margin:0 0 24px"><a href="${next.url}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#2dd4bf;color:#04221f;font-weight:bold;text-decoration:none">${next.label}</a></p>
<p style="margin:0">Hamza Tariq<br><span style="color:#64748b">${escape(SITE.jobTitle)} · <a href="${SITE.url}" style="color:#0d9488">hamzatariq.site</a></span></p>`);
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
