// Outreach emails. The first email is written by Gemini, grounded ONLY in that business's audit and
// content/owner/profile.md, then checked (subject under 50 characters, 70–110 words, the business
// name, no number that isn't in the facts, no links of its own). If the check fails twice, a fixed
// template built from the same audit is used. Follow-ups are short fixed templates in the same thread.
import fs from "node:fs";
import path from "node:path";
import { ThinkingLevel } from "@google/genai";
import { CHAT_MODEL, gemini } from "@/lib/assistant/gemini";
import { SITE } from "@/lib/site";
import type { AuditResult, Check } from "@/lib/audit/types";
import { BUSINESS_TYPES, isBusinessType } from "./osm";
import type { Prospect, ProspectAudit } from "./db";

export const SIGNATURE = ["Hamza Tariq", "Web developer, Devrex Digital", SITE.url];
export const FOOTER_LINE = "Hamza Tariq · Devrex Digital · Pakistan";
/** Postal address for the footer (OUTREACH_POSTAL_ADDRESS). US businesses are only emailed once it is set (CAN-SPAM). */
export const postalAddress = () => process.env.OUTREACH_POSTAL_ADDRESS?.trim() || "";
const footerLines = () => [FOOTER_LINE, ...(postalAddress() ? [postalAddress()] : [])];

export const reportUrl = (reportId: string) => `${SITE.url}/report/${reportId}`;
export const unsubscribeUrl = (token: string) => `${SITE.url}/unsubscribe/${token}`;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const typeLabel = (t: string) => (isBusinessType(t) ? BUSINESS_TYPES[t].label.toLowerCase() : "business");

/** The 1–2 most important problems: failed checks first, then warnings, heaviest first. */
export const topProblems = (audit: AuditResult | null, max = 2): Check[] =>
  (audit?.checks ?? [])
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1))
    .slice(0, max);

let profileCache: string | null = null;
const ownerProfile = () => {
  if (profileCache !== null) return profileCache;
  try {
    profileCache = fs.readFileSync(path.join(process.cwd(), "content/owner/profile.md"), "utf8").slice(0, 6000);
  } catch {
    profileCache = "";
  }
  return profileCache;
};

export type Draft = { subject: string; body: string; source: "gemini" | "template" };

/** Body + report link + signature: the part that is counted (70–110 words). The footer is added at send time. */
const assemble = (body: string, reportLink: string) => [body.trim(), `Your free report (no sign-up): ${reportLink}`, SIGNATURE.join("\n")].join("\n\n");

/** Every number in the text must appear in the facts (no invented figures). */
const unsupportedNumbers = (text: string, facts: string) => {
  const allowed = new Set(facts.match(/\d+(?:[.,]\d+)?/g) ?? []);
  // Links (the report id) are added by the code, not written by the model.
  return (text.replace(/https?:\/\/\S+/g, "").match(/\d+(?:[.,]\d+)?/g) ?? []).filter((n) => !allowed.has(n));
};

export const validate = (d: { subject: string; body: string }, name: string, facts: string) => {
  const problems: string[] = [];
  if (d.subject.length >= 50) problems.push(`subject is ${d.subject.length} characters (must be under 50)`);
  const n = words(d.body);
  if (n < 70 || n > 110) problems.push(`email is ${n} words (must be 70-110 including the report line and signature)`);
  const key = name.toLowerCase().replace(/['’]/g, "");
  if (!d.body.toLowerCase().replace(/['’]/g, "").includes(key)) problems.push(`the business name "${name}" is missing`);
  const bad = unsupportedNumbers(`${d.subject} ${d.body}`, facts);
  if (bad.length) problems.push(`numbers not in the facts: ${bad.join(", ")}`);
  if (/https?:\/\//.test(d.body.split("Your free report")[0])) problems.push("the body must not contain links");
  return problems;
};

const lower1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Deterministic first email from the same audit facts. */
export const templateFirst = (p: Prospect, audit: AuditResult | null, reportLink: string): Draft => {
  const problems = topProblems(audit);
  const body = audit
    ? [
        "Hi there,",
        `I came across ${p.name} and ran a quick SEO check on your website. ${problems.length > 1 ? "Two things stood out" : "One thing stood out"}: ${problems
          .map((c) => lower1(c.detail).replace(/\.$/, ""))
          .join("; and ")}.`,
        `${problems.length > 1 ? "Both are" : "It's"} fixable, and ${problems.length > 1 ? "they affect" : "it affects"} how easily people find ${p.name} on Google. I put the full results in a free report for you.`,
        "Would a short fix plan be useful? Happy to send one over.",
      ].join("\n\n")
    : [
        "Hi there,",
        `I found ${p.name} on OpenStreetMap, but I couldn't see a website listed for your ${typeLabel(p.business_type)}.`,
        "A simple, fast site helps people who search for you on Google find your hours, location and contact details, and get in touch.",
        "I put a short note together for you in a free report. Would it be useful if I sent a few ideas for a first site?",
      ].join("\n\n");
  const subject = (audit ? `Quick SEO check for ${p.name}` : `A website for ${p.name}?`).slice(0, 49);
  return { subject, body: assemble(body, reportLink), source: "template" };
};

/** First email: Gemini, checked, with up to one retry; template otherwise. */
export const draftFirst = async (p: Prospect, auditRow: ProspectAudit | null): Promise<Draft> => {
  const audit = auditRow?.result ?? null;
  const link = reportUrl(auditRow!.report_id);
  const problems = topProblems(audit);
  const facts = [
    `Business: ${p.name} (${typeLabel(p.business_type)}${p.city ? `, ${p.city}` : ""})`,
    audit
      ? `Website: ${audit.finalUrl}\nAudit score: ${audit.score}/100\nProblems found:\n${problems.map((c) => `- ${c.label}: ${c.detail}${c.fix ? ` Fix: ${c.fix}` : ""}`).join("\n")}`
      : "Website: none listed on OpenStreetMap (say only that you couldn't see one listed; never claim they have no website).",
  ].join("\n");
  const fallback = templateFirst(p, audit, link);
  const ai = gemini();
  if (!ai) return fallback;

  const system = `You write one short, personal cold email from Hamza Tariq, a web developer, to a small business he found on OpenStreetMap.
Use ONLY these facts and Hamza's profile below. Never invent results, clients, numbers, prices, guarantees or anything about the business beyond the facts.
Rules:
- Write the subject (under 50 characters, no clickbait, no emojis) and the body only. Do NOT add a signature, links or the report line: they are added after your text.
- Body: 50 to 80 words, plain friendly English, start with "Hi there,". Mention the business by its exact name "${p.name}". Explain 1 or 2 of the problems in plain words a shop owner understands, and why it matters for being found on Google.
- Say you put the full results in a free report for them. End with one soft question: if they have a website, whether a short fix plan would be useful; if no website is listed, whether a few ideas for a first site would be useful. No pressure, no "I hope this finds you well".
- Don't use any number unless it appears in the facts. Don't mention AI, OpenStreetMap tags or scores out of context.
Answer as JSON: {"subject": "...", "body": "..."}

HAMZA'S PROFILE
${ownerProfile()}`;

  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: [{ role: "user", parts: [{ text: `FACTS\n${facts}${feedback}` }] }],
        config: {
          systemInstruction: system,
          temperature: 0.7,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          abortSignal: AbortSignal.timeout(25000),
        },
      });
      const out = JSON.parse(res.text ?? "{}") as { subject?: string; body?: string };
      if (!out.subject || !out.body) throw new Error("empty");
      const draft = { subject: out.subject.trim().replace(/^subject:\s*/i, ""), body: assemble(out.body, link) };
      const problemsFound = validate(draft, p.name, `${facts}\n${ownerProfile()}`);
      if (!problemsFound.length) return { ...draft, source: "gemini" };
      feedback = `\n\nYour last draft broke these rules, fix them: ${problemsFound.join("; ")}.`;
    } catch {
      break;
    }
  }
  return fallback;
};

/** Follow-ups (same thread, "Re:" subject): short, fixed, factual. */
export const draftFollowUp = (p: Prospect, step: 1 | 2, firstSubject: string, reportLink: string, problem: Check | null): Draft => {
  const subject = /^re:/i.test(firstSubject) ? firstSubject : `Re: ${firstSubject}`;
  const body =
    step === 1
      ? [
          "Hi again,",
          `Just checking you saw my note about ${p.name}'s website. The free report is here if it's useful: ${reportLink}`,
          "If it's not a priority right now, no problem at all.",
          "Hamza",
        ].join("\n\n")
      : [
          "Hi,",
          `Last note from me. If you'd ever like help with ${problem ? lower1(problem.label) : "the website"} for ${p.name}, just reply to this email and I'll take a look.`,
          "Thanks,\nHamza",
        ].join("\n\n");
  return { subject, body, source: "template" };
};

/** Adds the footer (business line + unsubscribe link). Plain text is the main part of every email. */
export const withFooter = (body: string, unsubscribeLink: string) => `${body}\n\n--\n${footerLines().join("\n")}\nUnsubscribe: ${unsubscribeLink}`;

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Minimal HTML version: the same text, links clickable, footer small and grey. */
export const toHtml = (body: string, unsubscribeLink: string) => {
  const linkify = (t: string) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`);
  const paras = body
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px">${linkify(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111">${paras}<p style="margin:24px 0 0;font-size:12px;color:#777">${footerLines().map(esc).join("<br>")}<br><a href="${unsubscribeLink}" style="color:#777">Unsubscribe</a></p></body></html>`;
};
