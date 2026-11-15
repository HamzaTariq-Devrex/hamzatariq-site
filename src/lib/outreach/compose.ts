// Outreach emails (owner's playbook, 2026-11-16). Plain text only, no tracking, no HTML.
//
// Email 1 (day 0): "Hi {Business} team," + who I am + the ONE most important real problem from that
// prospect's audit, told as what it costs them (no technical words) + one niche proof line only when
// there's a real match (word for word from content/testimonials.json or a real project) + one CTA +
// a plain opt-out line + signature. No links at all. 60-90 words. Gemini writes the middle part from
// the audit; a check rejects any draft with a link, a technical word, more than one question or the
// wrong length, and asks for a rewrite; after that a fixed template from the same findings is used.
// Day 3 (40-60 words): one more real finding + the /report link (the only link). Day 7 (25-40
// words): polite close. Replies to hot replies and the 60-day "not now" check-back are templates too.
import fs from "node:fs";
import path from "node:path";
import { ThinkingLevel } from "@google/genai";
import { CHAT_MODEL, gemini } from "@/lib/assistant/gemini";
import { SITE } from "@/lib/site";
import { getTestimonial } from "@/lib/testimonials";
import { PROJECTS } from "@/data/projects";
import type { AuditResult } from "@/lib/audit/types";
import { groupOf, nounFor, type NicheGroup } from "./osm-types";
import { findings, type Finding } from "./problems";
import type { Prospect, ProspectAudit } from "./db";

export const SIGNATURE = "Hamza Tariq\nFounder, Devrex Digital · hamzatariq.site";
export const OPT_OUT = "Not interested? Just reply 'no' and I won't email again.";
/** Postal address (OUTREACH_POSTAL_ADDRESS). US businesses are only emailed once it is set (CAN-SPAM). */
export const postalAddress = () => process.env.OUTREACH_POSTAL_ADDRESS?.trim() || "";

export const reportUrl = (reportId: string) => `${SITE.url}/report/${reportId}`;

export const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

// ---------- Proof lines: real reviews (word for word) or real projects only ----------

const PROOF: Partial<Record<NicheGroup, { review?: string; sentence?: string; project?: string; line?: string; who?: string }>> = {
  jewellery: { review: "nagina-house-of-jewels", sentence: "Their team is amazing. Very accommodating and very professional.", who: "a jewellery brand we built a website for" },
  clinic: { review: "dr-humza", sentence: "The effort and passion you put into your work truly shows", who: "whose physiotherapy clinic we built a website for" },
  fashion: { review: "attire", sentence: "The website offers a perfect balance of style and efficiency.", who: "a womenswear label we built a website for" },
  ecommerce: { review: "auraluxe-bags", sentence: "Thank you for bringing our vision to life.", who: "a handmade bag brand we built a store for" },
  education: { project: "ascendant-consulting", line: "My team also built the website for Ascendant Consulting, a UK study-abroad consultancy." },
};

/** One proof line when the niche has a real match, else null. Quotes are checked against the source. */
export const proofLine = (businessType: string): string | null => {
  const g = groupOf(businessType);
  const p = g ? PROOF[g] : undefined;
  if (!p) return null;
  if (p.review && p.sentence) {
    const t = getTestimonial(p.review);
    if (!t || !t.quote.includes(p.sentence)) return null; // never paraphrase a review
    // An excerpt that stops mid-review ends with an ellipsis; the words themselves are never changed.
    return `${t.brand}, ${p.who}, said: "${p.sentence}${/[.!?]$/.test(p.sentence) ? "" : "…"}"`;
  }
  if (p.project && p.line && PROJECTS.some((x) => x.slug === p.project)) return p.line;
  return null;
};

/** A real related project for the report page (same niche first, else the flagship store). */
export const relatedProject = (businessType: string) => {
  const g = groupOf(businessType);
  const slug =
    g === "jewellery" ? "nagina-jewels" : g === "fashion" ? "dulhahouse" : g === "ecommerce" ? "auraluxebags" : g === "education" ? "ascendant-consulting" : g === "hotel" ? "the-trekkerz-pakistan" : "dulhahouse";
  return PROJECTS.find((p) => p.slug === slug) ?? PROJECTS[0];
};

// ---------- Subjects: 2-4 lowercase words, A/B per niche ----------

const shortName = (name: string, maxWords: number) =>
  name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&amp;|&/g, " ")
    .replace(/\b(ltd|limited|llp|plc|inc|co)\b\.?/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
    .join(" ");

const B_SUBJECT: Record<NicheGroup, string> = {
  jewellery: "online",
  fashion: "online shop",
  clinic: "new patients",
  restaurant: "on phones",
  salon: "new clients",
  realestate: "enquiries",
  gym: "new members",
  law: "new clients",
  accounting: "new clients",
  hotel: "direct bookings",
  auto: "on google",
  home: "on google",
  education: "new students",
  ecommerce: "online shop",
};

/** Variant A or B, 50/50 by prospect id (stable). */
export const variantFor = (prospectId: string): "A" | "B" => (parseInt(prospectId.replace(/-/g, "").slice(-2), 16) % 2 === 0 ? "A" : "B");

export const subjectFor = (p: Pick<Prospect, "name" | "business_type">, variant: "A" | "B") => {
  const g = groupOf(p.business_type) ?? "ecommerce";
  const suffix = variant === "A" ? "website" : B_SUBJECT[g];
  // 2-4 lowercase words in total: as much of the name as fits next to the suffix.
  const s = `${shortName(p.name, Math.max(1, 4 - words(suffix)))} ${suffix}`.trim();
  return s.split(/\s+/).slice(0, 4).join(" ");
};

// ---------- Checks ----------

const BANNED =
  /\b(h1|h2|heading tags?|meta|metadata|lcp|largest contentful|schema|ssl|tls|https?|core web vitals|seo|search engine optimi[sz]ation|lighthouse|pagespeed|viewport|canonical|sitemap|robots|crawl\w*|index(ing|ed)?|structured data|open graph|javascript|html|css|alt text|markup|plugin|render\w*|server|cms|wordpress|wix|squarespace|score)\b/i;
const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co\.uk|org\.uk|uk|org|net|io|ae|ca|com\.au|au|site|shop|store|online|biz|info)\b/i;

/** Problems with an email 1 draft (empty = OK). The plain "hamzatariq.site" in the signature is allowed. */
export const checkEmail1 = (body: string, subject: string, facts: string) => {
  const problems: string[] = [];
  const text = body.replaceAll("hamzatariq.site", "");
  if (LINK.test(text)) problems.push("it contains a link or web address (email 1 must have no links)");
  const banned = text.match(BANNED);
  if (banned) problems.push(`it uses the technical word "${banned[0]}"`);
  // The fixed opt-out line ("Not interested? ...") is not a question to the reader; the CTA is the one question.
  if ((body.replace(OPT_OUT, "").match(/\?/g) ?? []).length > 1) problems.push("it asks more than one question");
  const n = words(body);
  if (n > 90 || n < 60) problems.push(`it is ${n} words (must be 60-90)`);
  if (/\bhi there\b/i.test(body)) problems.push('it says "Hi there"');
  const allowed = new Set(facts.match(/\d+(?:[.,]\d+)?/g) ?? []);
  const nums = (text.match(/\d+(?:[.,]\d+)?/g) ?? []).filter((x) => !allowed.has(x));
  if (nums.length) problems.push(`it uses numbers that aren't in the facts: ${nums.join(", ")}`);
  if (subject !== subject.toLowerCase() || words(subject) < 2 || words(subject) > 4) problems.push("the subject must be 2-4 lowercase words");
  return problems;
};

let profileCache: string | null = null;
const ownerProfile = () => {
  if (profileCache !== null) return profileCache;
  try {
    profileCache = fs.readFileSync(path.join(process.cwd(), "content/owner/profile.md"), "utf8").slice(0, 5000);
  } catch {
    profileCache = "";
  }
  return profileCache;
};

export type Draft = { subject: string; body: string; variant: "A" | "B" | null; source: "gemini" | "template" };

const lead = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ctx = (p: Prospect) => ({ noun: nounFor(p.business_type, p.osm_tags), city: p.city });
export const prospectFindings = (p: Prospect, audit: AuditResult | null) => findings(audit, ctx(p));

/** The CTA never promises more fixes than the audit really found. */
const cta = (f: Finding[]) => {
  if (f[0]?.id === "no-website") return "Want me to send you a few ideas for a simple website?";
  const n = f.length;
  return n >= 3 ? "Want me to send you the 3 quick fixes I found?" : n === 2 ? "Want me to send you the 2 quick fixes I found?" : "Want me to send you the quick fix I found?";
};

const assemble1 = (p: Prospect, middle: string, f: Finding[], withProof = true) =>
  [`Hi ${p.name} team,`, middle.trim(), withProof ? proofLine(p.business_type) : null, cta(f), OPT_OUT, SIGNATURE].filter(Boolean).join("\n\n");

/** Template email 1 from the same real findings (also the fallback when Gemini's draft fails the check). */
const templateMiddle = (p: Prospect, f: Finding[]) => {
  const first = f[0];
  const parts = [
    "I'm Hamza, a web developer.",
    first.id === "no-website" ? `${lead(first.cost)}.` : `I had a look at ${p.name} online and noticed that ${first.cost}.`,
  ];
  return parts.join(" ");
};

export const draftEmail1 = async (p: Prospect, auditRow: ProspectAudit | null): Promise<Draft & { findings: Finding[] }> => {
  const audit = auditRow?.result ?? null;
  const f = prospectFindings(p, audit);
  const variant = variantFor(p.id);
  const subject = subjectFor(p, variant);
  if (!f.length) throw new Error("No real finding to write about.");
  const fixed = assemble1(p, "", f);
  const budget = { min: Math.max(15, 62 - words(fixed)), max: Math.max(20, 88 - words(fixed)) };
  const facts = [`${p.name}`, p.city ?? "", ...f.map((x) => x.cost), String(Math.min(3, f.length))].join("\n");
  // Template candidates from the same findings, in order of preference. Email 1 names one problem
  // only, so a short one is padded with what Hamza does (never a second problem), and a long one
  // drops the optional proof line. The first candidate that passes the check is the fallback.
  const pad = " I help small businesses turn their websites into a steady source of enquiries.";
  const fallback = [
    assemble1(p, templateMiddle(p, f), f),
    assemble1(p, templateMiddle(p, f) + pad, f),
    assemble1(p, templateMiddle(p, f), f, false),
    assemble1(p, templateMiddle(p, f) + pad, f, false),
  ].find((b) => !checkEmail1(b, subject, facts).length);
  const noDraft = () => {
    if (!fallback) throw new Error("Email 1 could not meet the rules (60-90 words, no links, no technical words).");
    return { subject, body: fallback, variant, source: "template" as const, findings: f };
  };
  const ai = gemini();
  if (!ai) return noDraft();

  const system = `You write the middle of a short cold email from Hamza Tariq, founder of Devrex Digital, a small web studio, to a small business.
Write ONLY the middle part: ${budget.min}-${budget.max} words, plain friendly English, 1 to 3 sentences.
- Start by saying who Hamza is in a few words (a web developer who helps small businesses).
- Then explain this ONE problem from their website, in plain words, as what it costs them: "${f[0].cost}".
- You may rephrase it, but keep its meaning and any number exactly as given. Do not add other problems.
- No greeting, no sign-off, no question, no links, no web addresses, no technical words (no SEO, H1, meta, schema, SSL, speed scores, etc.).
- Never invent anything: no results, clients, prices, guarantees or claims about their business beyond the facts.
Answer as JSON: {"middle": "..."}

HAMZA'S PROFILE (background only)
${ownerProfile()}`;

  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: [{ role: "user", parts: [{ text: `Business: ${p.name} (${ctx(p).noun}${p.city ? `, ${p.city}` : ""})${feedback}` }] }],
        config: {
          systemInstruction: system,
          temperature: 0.6,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          abortSignal: AbortSignal.timeout(25000),
        },
      });
      const out = JSON.parse(res.text ?? "{}") as { middle?: string };
      if (!out.middle) throw new Error("empty");
      const body = assemble1(p, out.middle, f);
      const problems = checkEmail1(body, subject, facts);
      if (!problems.length) return { subject, body, variant, source: "gemini", findings: f };
      feedback = `\n\nYour last draft was rejected because ${problems.join("; ")}. Rewrite it.`;
    } catch {
      break;
    }
  }
  // Never returns a draft that fails the check: the caller skips the prospect instead.
  return noDraft();
};

/** Day 3 (40-60 words): one more real finding in plain words + the report link (the only link). */
export const draftDay3 = (p: Prospect, firstSubject: string, reportLink: string, f: Finding[]): Draft => {
  const next = f[1];
  const body = [
    `Hi ${p.name} team,`,
    next ? `One more thing I noticed: ${next.cost}.` : `Following up on my note about ${p.name}: ${f[0]?.cost ?? "your website could bring you more enquiries"}.`,
    `I put what I found in a short, plain-English report for you here: ${reportLink}`,
    OPT_OUT,
    "Hamza",
  ].join("\n\n");
  return { subject: reSubject(firstSubject), body, variant: null, source: "template" };
};

/** Day 7 (25-40 words): polite close. */
export const draftDay7 = (p: Prospect, firstSubject: string): Draft => ({
  subject: reSubject(firstSubject),
  body: [`Hi ${p.name} team,`, "I haven't heard back, so I'll assume now isn't the right time and stop emailing. Should I close your file?", "Thanks for reading either way.", "Hamza"].join("\n\n"),
  variant: null,
  source: "template",
});

/** Reply to an interested reply or a question: Hamza edits and approves it. Report link + WhatsApp. */
export const draftHotReply = (p: Prospect, firstSubject: string, reportLink: string | null): Draft => ({
  subject: reSubject(firstSubject),
  body: [
    `Hi ${p.name} team,`,
    "Thanks for getting back to me.",
    reportLink ? `Here's the short report with what I found and how to fix it: ${reportLink}` : "",
    `If it's easier to talk it through, message me on WhatsApp: ${SITE.whatsappDisplay}`,
    SIGNATURE,
  ]
    .filter(Boolean)
    .join("\n\n"),
  variant: null,
  source: "template",
});

/** "Not now" replies: one check-back 60 days later. */
export const draftCheckBack = (p: Prospect, firstSubject: string, f: Finding[]): Draft => ({
  subject: reSubject(firstSubject),
  body: [
    `Hi ${p.name} team,`,
    "You mentioned the timing wasn't right when I wrote a while ago, so I'm checking back once.",
    cta(f),
    OPT_OUT,
    "Hamza",
  ].join("\n\n"),
  variant: null,
  source: "template",
});

const reSubject = (s: string) => (/^re:/i.test(s) ? s : `Re: ${s}`);

/** WhatsApp / Instagram message (2-3 lines): one real problem, one question, no links. */
export const manualMessage = (p: Pick<Prospect, "name" | "business_type" | "osm_tags" | "city">, audit: AuditResult | null) => {
  const f = findings(audit, { noun: nounFor(p.business_type, p.osm_tags ?? {}), city: p.city });
  if (!f.length) return `Hi ${p.name} team, I'm Hamza, a web developer who helps small businesses get more enquiries online. Would a few ideas for your website be useful?`;
  const problem = f[0].id === "no-website" ? `${lead(f[0].cost)}.` : `I had a look at your website and noticed ${f[0].cost}.`;
  return `Hi ${p.name} team, I'm Hamza, a web developer.\n${problem}\n${cta(f)}`;
};
