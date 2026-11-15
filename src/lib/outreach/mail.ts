// Outreach mailbox: sends through Gmail SMTP (OUTREACH_*), never through hamzatariq.site or Resend,
// and reads replies and bounces over IMAP.
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { ImapFlow, type MessageStructureObject } from "imapflow";
import { SITE } from "@/lib/site";
import { toHtml, unsubscribeUrl, withFooter } from "./compose";

const env = () => {
  const host = process.env.OUTREACH_SMTP_HOST;
  const user = process.env.OUTREACH_SMTP_USER;
  const pass = process.env.OUTREACH_SMTP_PASS;
  if (!host || !user || !pass) throw new Error("OUTREACH_SMTP_HOST, OUTREACH_SMTP_USER and OUTREACH_SMTP_PASS must be set.");
  return {
    host,
    port: Number(process.env.OUTREACH_SMTP_PORT || 465),
    imapHost: process.env.OUTREACH_IMAP_HOST || "imap.gmail.com",
    user,
    pass,
    from: process.env.OUTREACH_FROM || user,
  };
};

export const outreachAddress = () => env().user.toLowerCase();

/** One-click unsubscribe endpoint for the List-Unsubscribe header (RFC 8058). */
export const oneClickUrl = (token: string) => `${SITE.url}/api/outreach/unsubscribe/${token}`;

export type Outgoing = {
  to: string;
  subject: string;
  /** Body without the footer; the footer and unsubscribe link are added here. */
  body: string;
  unsubscribeToken: string;
  /** Message-ID of the first email, for follow-ups in the same thread. */
  threadId?: string | null;
};

/** Sends one email and returns its Message-ID. */
export const sendOutreach = async (m: Outgoing) => {
  const e = env();
  const transport = nodemailer.createTransport({ host: e.host, port: e.port, secure: e.port === 465, auth: { user: e.user, pass: e.pass } });
  const messageId = `<${randomUUID()}@hamzatariq.site>`;
  const unsub = unsubscribeUrl(m.unsubscribeToken);
  try {
    await transport.sendMail({
      from: e.from,
      to: m.to,
      subject: m.subject,
      text: withFooter(m.body, unsub),
      html: toHtml(m.body, unsub),
      messageId,
      ...(m.threadId ? { inReplyTo: m.threadId, references: [m.threadId] } : {}),
      headers: {
        "List-Unsubscribe": `<${oneClickUrl(m.unsubscribeToken)}>, <mailto:${e.user}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } finally {
    transport.close();
  }
  return messageId;
};

/** Login-only check for both servers (no email is sent). */
export const checkLogin = async () => {
  const e = env();
  const transport = nodemailer.createTransport({ host: e.host, port: e.port, secure: e.port === 465, auth: { user: e.user, pass: e.pass } });
  const smtp = await transport.verify().then(() => "ok", (err: Error) => err.message);
  transport.close();
  const client = new ImapFlow({ host: e.imapHost, port: 993, secure: true, auth: { user: e.user, pass: e.pass }, logger: false });
  const imap = await client.connect().then(() => "ok", (err: Error) => err.message);
  await client.logout().catch(() => {});
  return { smtp, imap };
};

export type Incoming = {
  uid: number;
  from: string;
  subject: string;
  date: string;
  kind: "reply" | "bounce" | "complaint" | "unsubscribe" | "auto-reply" | "other";
  /** Message-IDs this message refers to (In-Reply-To, References, or quoted in a bounce). */
  refs: string[];
  /** Bounced address, from X-Failed-Recipients or Final-Recipient. */
  failed: string | null;
  text: string;
};

const header = (raw: string, name: string) => {
  const m = raw.match(new RegExp(`^${name}:([^\\r\\n]*(?:\\r?\\n[ \\t][^\\r\\n]*)*)`, "im"));
  return m ? m[1].replace(/\r?\n[ \t]+/g, " ").trim() : "";
};

const textPart = (node: MessageStructureObject | undefined): string | null => {
  if (!node) return null;
  if (node.type === "text/plain" && node.disposition !== "attachment") return node.part ?? "1";
  for (const child of node.childNodes ?? []) {
    const p = textPart(child);
    if (p) return p;
  }
  return null;
};

/**
 * New messages in INBOX since the last checked UID (or since `since` on the first run).
 * Classifies each one; the caller matches them to prospects.
 */
export const readInbox = async (lastUid: number | null, since: Date) => {
  const e = env();
  const client = new ImapFlow({ host: e.imapHost, port: 993, secure: true, auth: { user: e.user, pass: e.pass }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  const out: Incoming[] = [];
  let maxUid = lastUid ?? 0;
  try {
    const uids = lastUid ? null : ((await client.search({ since }, { uid: true })) || []);
    const range = lastUid ? `${lastUid + 1}:*` : uids && uids.length ? uids.join(",") : null;
    const raw: { uid: number; head: string; source: string; part: string | null; from: string; subject: string; date: string }[] = [];
    if (range) {
      for await (const msg of client.fetch(range, { uid: true, envelope: true, bodyStructure: true, source: { maxLength: 150_000 } }, { uid: true })) {
        if (lastUid && msg.uid <= lastUid) continue;
        const source = msg.source?.toString("utf8") ?? "";
        const headEnd = source.search(/\r?\n\r?\n/);
        raw.push({
          uid: msg.uid,
          head: headEnd > 0 ? source.slice(0, headEnd) : source,
          source,
          part: textPart(msg.bodyStructure),
          from: msg.envelope?.from?.[0]?.address?.toLowerCase() ?? "",
          subject: msg.envelope?.subject ?? "",
          date: new Date(msg.envelope?.date ?? Date.now()).toISOString(),
        });
      }
    }
    for (const r of raw) {
      maxUid = Math.max(maxUid, r.uid);
      const ctype = header(r.head, "Content-Type").toLowerCase();
      const refs = [...`${header(r.head, "In-Reply-To")} ${header(r.head, "References")}`.matchAll(/<[^>\s]+>/g)].map((m) => m[0]);
      let kind: Incoming["kind"] = "other";
      let failed: string | null = null;
      if (/report-type="?feedback-report/.test(ctype)) kind = "complaint";
      else if (/^(mailer-daemon|postmaster)@/.test(r.from) || /report-type="?delivery-status/.test(ctype)) {
        const permanent = /^Action:\s*failed/im.test(r.source) || /^Status:\s*5\./im.test(r.source) || /X-Failed-Recipients:/i.test(r.head);
        if (permanent) {
          kind = "bounce";
          failed = (header(r.head, "X-Failed-Recipients") || r.source.match(/Final-Recipient:\s*rfc822;\s*([^\s;]+)/i)?.[1] || "").toLowerCase() || null;
          for (const m of r.source.matchAll(/^Message-ID:\s*(<[^>\s]+>)/gim)) refs.push(m[1]);
        }
      } else if (/auto-replied|auto-generated/i.test(header(r.head, "Auto-Submitted")) || header(r.head, "X-Autoreply") || /out of (the )?office|automatic reply|auto-?reply|autoreply/i.test(r.subject)) {
        kind = "auto-reply";
      } else if (/^\s*(re:\s*)?unsubscribe\b/i.test(r.subject)) kind = "unsubscribe";
      else kind = "reply";
      let text = "";
      if (kind === "reply" && r.part) {
        try {
          const { content } = await client.download(String(r.uid), r.part, { uid: true, maxBytes: 20_000 });
          const chunks: Buffer[] = [];
          if (content) for await (const c of content) chunks.push(c as Buffer);
          text = Buffer.concat(chunks).toString("utf8");
        } catch {
          text = "";
        }
      }
      // Keep only the new part of a reply (drop the quoted email below "On … wrote:").
      text = text.split(/\r?\n(?:On .+wrote:|-{2,}\s*Original Message|>)/)[0].trim().slice(0, 3000);
      out.push({ uid: r.uid, from: r.from, subject: r.subject, date: r.date, kind, refs, failed, text });
    }
    // First run: start from the current end of the mailbox, so later runs never re-read old mail.
    const mailbox = client.mailbox;
    if (!lastUid && mailbox && typeof mailbox === "object" && mailbox.uidNext) maxUid = Math.max(maxUid, Number(mailbox.uidNext) - 1);
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
  return { messages: out, maxUid };
};
