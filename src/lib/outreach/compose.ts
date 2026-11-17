// Outreach emails (owner's playbook, 2026-11-16). Plain text only, no tracking, no HTML.
//
// Email 1 (day 0): greeting (hello: "Hi Jo," for a personal address, "Hi {Business} team," or
// "Hi there," for an odd name) + who I am + the ONE most important real problem from that
// prospect's audit, told as what it costs them (no technical words) + one niche proof line only when
// there's a real match (word for word from content/testimonials.json or a real project) + one CTA +
// a plain opt-out line + signature. No links at all. 60-90 words. Gemini writes the middle part from
// the audit; a check rejects any draft with a link, a technical word, more than one question or the
// wrong length, and asks for a rewrite; after that a fixed template from the same findings is used.
// Day 3 (40-60 words): one more real finding + the /report link (the only link). Day 7 (25-40
// words): polite close. Replies to hot replies and the 60-day "not now" check-back are templates too.
import { outreachJson } from "./ai";
import { SITE } from "@/lib/site";
import { getTestimonial } from "@/lib/testimonials";
import { PROJECTS } from "@/data/projects";
import { SERVICES } from "@/data/services";
import type { AuditResult } from "@/lib/audit/types";
import { groupOf, nounFor, takesBookings, type NicheGroup } from "./osm-types";
import { contentFindings, findings, type Finding } from "./problems";
import type { Topic } from "./topics";
import type { Prospect, ProspectAudit } from "./db";
import { cleanName, oddName } from "./checks";
import { personFromEmail } from "./email-check";

export const SIGNATURE = "Hamza Tariq\nFounder, Devrex Digital · hamzatariq.site";
export const OPT_OUT = "Not interested? Just reply 'no' and I won't email again.";
export { postalAddress, withAddress } from "./address";

type Named = Pick<Prospect, "name"> & { email?: string | null; research?: Prospect["research"] };
/** The business name as written in emails: no symbols ("Joe's @ Home" → "Joe's Home"). */
export const biz = (p: Named) => cleanName(p.name) || p.name.trim();
/**
 * Greeting (owner, 2026-11-17): "Hi Jo," when the address is clearly a person's (jo.adele@);
 * otherwise "Hi {Business} team,", or "Hi there," when the business name is odd (symbols etc.).
 */
export const hello = (p: Named) => {
  // The owner's first name when the research found it clearly stated on their site.
  const person = p.research?.owner ?? personFromEmail(p.email, p.name);
  if (person) return `Hi ${person},`;
  if (cleanName(p.name) !== p.name.trim().replace(/\s+/g, " ") || oddName(p.name)) return "Hi there,";
  return `Hi ${biz(p)} team,`;
};

export const reportUrl = (reportId: string) => `${SITE.url}/report/${reportId}`;
export const previewUrl = (previewId: string) => `${SITE.url}/preview/${previewId}`;

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

// ---------- Subjects: short and lowercase, the full business name, A/B ----------

/** Up to 6 words, so a long business name is never cut in half (owner, 2026-11-18). */
const SUBJECT_MAX_WORDS = 6;

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


/** Variant A or B, 50/50 by prospect id (stable). */
export const variantFor = (prospectId: string): "A" | "B" => (parseInt(prospectId.replace(/-/g, "").slice(-2), 16) % 2 === 0 ? "A" : "B");

/** Subject words that match the email's one problem (owner, 2026-11-18); anything else is "website". */
const PROBLEM_SUBJECT: Record<string, string> = {
  "not-mobile": "on phones",
  "slow-mobile": "on phones",
  title: "on google",
  description: "on google",
  hidden: "on google",
  "no-contact": "enquiries",
  "stale-blog": "blog",
  "no-blog": "blog",
  "few-pages": "blog",
};

/**
 * "{business} website" (A) or "{business} {what the problem is about}" (B), lowercase. The business
 * name is never cut (owner, 2026-11-18): a long name just gets "website" or nothing after it.
 */
export const subjectFor = (p: Pick<Prospect, "name" | "business_type">, variant: "A" | "B", problem?: string) => {
  const name = shortName(p.name, 99);
  const suffix = variant === "B" && problem && PROBLEM_SUBJECT[problem] ? PROBLEM_SUBJECT[problem] : "website";
  const n = words(name);
  if (n + words(suffix) <= SUBJECT_MAX_WORDS) return `${name} ${suffix}`;
  if (n + 1 <= SUBJECT_MAX_WORDS) return `${name} website`;
  return n >= 2 ? name : `${name} website`;
};

// ---------- Checks ----------

const BANNED =
  /\b(h1|h2|heading tags?|meta|metadata|lcp|largest contentful|schema|ssl|tls|https?|core web vitals|seo|search engine optimi[sz]ation|lighthouse|pagespeed|viewport|canonical|sitemap|robots|crawl\w*|index(ing|ed)?|structured data|open graph|javascript|html|css|alt text|markup|plugin|render\w*|server|cms|wordpress|wix|squarespace|score)\b/i;
const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co\.uk|org\.uk|uk|org|net|io|ae|ca|com\.au|au|site|shop|store|online|biz|info)\b/i;

/** Problems with an email 1 draft (empty = OK). The plain "hamzatariq.site" in the signature is allowed. */
export const checkEmail1 = (body: string, subject: string, facts: string, bookings = true) => {
  const problems: string[] = [];
  // Shops and offices don't take bookings: "book" only for booking niches (owner, 2026-11-16).
  if (!bookings && /\bbook(s|ed|ing|ings)?\b/i.test(body)) problems.push('it mentions booking, but this business does not take bookings (say "call or WhatsApp")');
  const text = body.replaceAll("hamzatariq.site", "");
  if (LINK.test(text)) problems.push("it contains a link or web address (email 1 must have no links)");
  const banned = text.match(BANNED);
  if (banned) problems.push(`it uses the technical word "${banned[0]}"`);
  // The fixed opt-out line ("Not interested? ...") is not a question to the reader; the CTA is the one question.
  if ((body.replace(OPT_OUT, "").match(/\?/g) ?? []).length > 1) problems.push("it asks more than one question");
  const n = words(body);
  if (n > 90 || n < 60) problems.push(`it is ${n} words (must be 60-90)`);
  // "Hi there," is allowed as the greeting for odd business names (owner, 2026-11-17), nowhere else.
  if (/\bhi there\b/i.test(body.split("\n").slice(1).join("\n"))) problems.push('it says "Hi there"');
  const allowed = new Set(facts.match(/\d+(?:[.,]\d+)?/g) ?? []);
  const nums = (text.match(/\d+(?:[.,]\d+)?/g) ?? []).filter((x) => !allowed.has(x));
  if (nums.length) problems.push(`it uses numbers that aren't in the facts: ${nums.join(", ")}`);
  if (subject !== subject.toLowerCase() || words(subject) < 2 || words(subject) > SUBJECT_MAX_WORDS) problems.push(`the subject must be 2-${SUBJECT_MAX_WORDS} lowercase words`);
  return problems;
};


export type Draft = { subject: string; body: string; variant: "A" | "B" | null; source: "gemini" | "template" };

const lead = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/**
 * The city emails name (owner, 2026-11-18): the address on their own site wins over OpenStreetMap;
 * when the site doesn't show where they are, no city at all.
 */
export const emailCity = (p: Pick<Prospect, "city"> & { research?: Prospect["research"] }) => (p.research && p.research.city !== undefined ? p.research.city : p.city);
const ctx = (p: Pick<Prospect, "business_type" | "osm_tags" | "city"> & { research?: Prospect["research"] }) => ({
  noun: nounFor(p.business_type, p.osm_tags ?? {}),
  city: emailCity(p),
  bookings: takesBookings(p.business_type),
});

/** Strong sites (audit 70+) get the SEO + content offer instead of small fixes (owner, 2026-11-18). */
export const isContentLead = (p: Pick<Prospect, "website" | "audit_score">) => !!p.website && (p.audit_score ?? 0) >= 70;
export type Offer = "no-website" | "fixes" | "content";
export const offerFor = (p: Pick<Prospect, "website" | "audit_score">): Offer => (!p.website ? "no-website" : isContentLead(p) ? "content" : "fixes");
const CONTENT_IDS = new Set(["stale-blog", "no-blog", "few-pages"]);
export const isContentFinding = (f?: Finding) => !!f && CONTENT_IDS.has(f.id);

/** The findings an email talks about: content gaps for strong sites, else the audit's problems. */
export const prospectFindings = (p: Prospect, audit: AuditResult | null) => (isContentLead(p) ? contentFindings(p.research?.content) : findings(audit, ctx(p)));

/** The real "Monthly SEO + content" tier from src/data/services.ts. */
export const contentService = () => {
  for (const s of SERVICES) for (const t of s.pricing) if (/monthly seo/i.test(t.name)) return { name: t.name, price: `$${t.price.toLocaleString("en-US")}${t.unit ?? ""}` };
  return null;
};
export const CONTENT_CTA = "Want me to send you 3 blog topics your customers are searching for?";

/** The CTA never promises more fixes than the audit really found. */
const cta = (f: Finding[]) => {
  // No website: offer a free sample homepage (owner, 2026-11-17: never "send it" without saying what).
  if (f[0]?.id === "no-website") return "Want me to make you a free sample homepage?";
  if (isContentFinding(f[0])) return CONTENT_CTA;
  const n = f.length;
  return n >= 3 ? "Want me to send you the 3 quick fixes I found?" : n === 2 ? "Want me to send you the 2 quick fixes I found?" : "Want me to send you the quick fix I found?";
};

/** The research's personal opening line (verified against their site), or "" when there's none. */
export const personalLine = (p: Pick<Prospect, "research">) => (p.research?.active && p.research.line ? p.research.line.trim() : "");

/** Who Hamza is, in every email 1 (owner, 2026-11-18: matches the signature). Written by code, never by Gemini. */
export const INTRO = "I'm Hamza, I run Devrex Digital, a small web studio.";
/** An older Gemini middle that still starts with its own intro: that sentence is dropped. */
const problemOnly = (middle: string) => {
  const m = middle.trim().replace(/^I'?m Hamza\b[^.]*\.\s*/i, "");
  // A sentence, even when Gemini copied the plain finding ("your homepage title…" → "Your homepage title….").
  return m ? `${m.charAt(0).toUpperCase()}${m.slice(1)}${/[.!?]$/.test(m) ? "" : "."}` : m;
};

/**
 * The Gemini sentence must say the audit's finding, not something else (owner, 2026-11-18: every
 * problem literally true): most of the finding's key words (by stem) must be in it.
 */
export const conveysProblem = (middle: string, cost: string) => {
  const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "").slice(0, 5);
  const keys = [...new Set(cost.toLowerCase().match(/[a-z]{4,}/g) ?? [])].filter((w) => !["your", "that", "they", "them", "have", "from", "with", "this", "there", "people", "visitors"].includes(w));
  const text = middle.toLowerCase();
  const hit = keys.filter((w) => text.includes(stem(w))).length;
  return keys.length ? hit / keys.length >= 0.6 : true;
};

const assemble1 = (p: Prospect, middle: string, f: Finding[], withProof = true) =>
  [hello(p), [personalLine(p), INTRO, problemOnly(middle)].filter(Boolean).join(" "), withProof ? proofLine(p.business_type) : null, cta(f), OPT_OUT, SIGNATURE].filter(Boolean).join("\n\n");

/** Template email 1 from the same real findings (also the fallback when Gemini's draft fails the check). */
const templateMiddle = (p: Prospect, f: Finding[]) => {
  const first = f[0];
  return first.id === "no-website" ? `${lead(first.cost)}.` : `I had a look at ${biz(p)} online and noticed that ${first.cost}.`;
};

/** "a jeweller in Manchester" / "an optician nearby". */
const searchPhrase = (p: Pick<Prospect, "business_type" | "osm_tags" | "city"> & { research?: Prospect["research"] }) => {
  const noun = nounFor(p.business_type, p.osm_tags ?? {});
  const city = emailCity(p);
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}${city ? ` in ${city}` : " nearby"}`;
};

/**
 * No website (verified), no-link version until the premium demo template is built (owner, 2026-11-17):
 * "I couldn't find a website for {business}, so people searching for a {niche} in {city} find other
 * places first. Want me to make you a free sample homepage?" Fixed template, no Gemini, no link.
 */
const noWebsiteEmail1 = (p: Prospect, f: Finding[], subject: string, variant: "A" | "B") => {
  const core = `I couldn't find a website for ${biz(p)}, so people searching for ${searchPhrase(p)} find other places first.`;
  const pad = " A simple site with your opening hours, location and a call button would fix that.";
  const facts = [p.name, emailCity(p) ?? ""].join("\n");
  const body = [
    assemble1(p, core, f),
    assemble1(p, `${core}${pad}`, f),
    assemble1(p, core, f, false),
    assemble1(p, `${core}${pad}`, f, false),
  ].find((b) => !checkEmail1(b, subject, facts, takesBookings(p.business_type)).length);
  if (!body) throw new Error("Email 1 could not meet the rules (60-90 words, no links, no technical words).");
  return { subject, body, variant, source: "template" as const, findings: f };
};

export const draftEmail1 = async (p: Prospect, auditRow: ProspectAudit | null): Promise<Draft & { findings: Finding[] }> => {
  const audit = auditRow?.result ?? null;
  const f = prospectFindings(p, audit);
  if (!f.length) throw new Error(isContentLead(p) ? "Strong site with no content gap to mention" : "No real finding to write about.");
  const variant = variantFor(p.id);
  const subject = subjectFor(p, variant, f[0].id);
  if (f[0].id === "no-website") return noWebsiteEmail1(p, f, subject, variant);
  const fixed = assemble1(p, "", f);
  const line = personalLine(p);
  const budget = { min: Math.max(15, 62 - words(fixed)), max: Math.max(20, 88 - words(fixed)) };
  const facts = [biz(p), emailCity(p) ?? "", line, ...f.map((x) => x.cost), String(Math.min(3, f.length))].join("\n");
  // Template candidates from the same findings, in order of preference. Email 1 names one problem
  // only, so a short one is padded with what Hamza does (never a second problem), and a long one
  // drops the optional proof line. The first candidate that passes the check is the fallback.
  const pad = " I help small businesses turn their websites into a steady source of enquiries.";
  const fallback = [
    assemble1(p, templateMiddle(p, f), f),
    assemble1(p, templateMiddle(p, f) + pad, f),
    assemble1(p, templateMiddle(p, f), f, false),
    assemble1(p, templateMiddle(p, f) + pad, f, false),
  ].find((b) => !checkEmail1(b, subject, facts, takesBookings(p.business_type)).length);
  const noDraft = () => {
    if (!fallback) throw new Error("Email 1 could not meet the rules (60-90 words, no links, no technical words).");
    return { subject, body: fallback, variant, source: "template" as const, findings: f };
  };
  const ok = (middle: string) =>
    !conveysProblem(problemOnly(middle), f[0].cost)
      ? null
      : [assemble1(p, middle, f), assemble1(p, middle, f, false)].find((b) => !checkEmail1(b, subject, facts, takesBookings(p.business_type)).length) ?? null;
  // 1. The middle written in the research call (one Gemini call per lead, owner 2026-11-18).
  const first = p.research?.middle?.trim();
  if (first) {
    const body = ok(first);
    if (body) return { subject, body, variant, source: "gemini", findings: f };
    // 2. One rewrite call only when a check fails.
    const problems = checkEmail1(assemble1(p, first, f, false), subject, facts, takesBookings(p.business_type));
    try {
      const out = await outreachJson<{ middle?: string }>({
        system: `You fix one sentence of a short cold email from Hamza Tariq, who runs Devrex Digital, to a small business. ${Math.max(10, budget.min)}-${budget.max} words, plain friendly English, 1 sentence.
It comes right after "${[line, INTRO].filter(Boolean).join(" ")}", so don't introduce Hamza again. Explain this ONE problem with their website as what it costs them: "${f[0].cost}". Keep its meaning and any number exactly; don't exaggerate.
No greeting, sign-off, question, link, web address or technical word (no SEO, H1, meta, schema, SSL, speed scores). Never invent anything.
Answer as JSON: {"middle": "..."}`,
        user: `Business: ${biz(p)} (${ctx(p).noun}${p.city ? `, ${p.city}` : ""})\nYour draft: "${first}"\nIt was rejected because ${problems.join("; ") || "the whole email was too long or too short"}. Rewrite it.`,
        maxTokens: 300,
        temperature: 0.4,
      });
      const body = out.middle ? ok(out.middle) : null;
      if (body) return { subject, body, variant, source: "gemini", findings: f };
    } catch {
      // budget, back-off or busy: the template below
    }
  }
  // 3. Never returns a draft that fails the check: the template, or the caller skips the prospect.
  return noDraft();
};

/** Day 3 (40-60 words): one more real finding in plain words + the report link (the only link). */
export const draftDay3 = (p: Prospect, firstSubject: string, reportLink: string, f: Finding[]): Draft => {
  // No website: the homepage concept link instead of a report.
  // No website: no link until the premium demo template is built (owner, 2026-11-17).
  if (f[0]?.id === "no-website") {
    return {
      subject: reSubject(firstSubject),
      body: [
        hello(p),
        `Just following up: I'd be happy to make a free sample homepage for ${biz(p)}, using only your public details like your address, phone number and opening hours.`,
        "No cost and no obligation. Want me to make it?",
        OPT_OUT,
        "Hamza",
      ].join("\n\n"),
      variant: null,
      source: "template",
    };
  }
  // Content offer: the next content gap, the same question again, no report link.
  if (isContentFinding(f[0])) {
    return {
      subject: reSubject(firstSubject),
      body: [
        hello(p),
        f[1] ? `One more thing I noticed: ${f[1].cost}.` : `Following up on my note about ${biz(p)}: ${f[0].cost}.`,
        CONTENT_CTA,
        OPT_OUT,
        "Hamza",
      ].join("\n\n"),
      variant: null,
      source: "template",
    };
  }
  const next = f[1];
  const body = [
    hello(p),
    next ? `One more thing I noticed: ${next.cost}.` : `Following up on my note about ${biz(p)}: ${f[0]?.cost ?? "your website could bring you more enquiries"}.`,
    `I put what I found in a short, plain-English report for you here: ${reportLink}`,
    OPT_OUT,
    "Hamza",
  ].join("\n\n");
  return { subject: reSubject(firstSubject), body, variant: null, source: "template" };
};

/** Day 7 (25-40 words): polite close. */
export const draftDay7 = (p: Prospect, firstSubject: string): Draft => ({
  subject: reSubject(firstSubject),
  body: [hello(p), "I haven't heard back, so I'll assume now isn't the right time and stop emailing. Should I close your file?", "Thanks for reading either way.", "Hamza"].join("\n\n"),
  variant: null,
  source: "template",
});

const whatsappLine = `If it's easier to talk it through, message me on WhatsApp: ${SITE.social.whatsapp}`;

/**
 * Automatic answer to "yes / send it / interested" (owner, 2026-11-16): the (up to) 3 real fixes in
 * plain words + the /report or /preview link + WhatsApp, in the same thread.
 */
export const replyInterested = (p: Prospect, firstSubject: string, f: Finding[], reportLink: string | null, topics?: Topic[] | null): Draft => {
  const noSite = f[0]?.id === "no-website";
  const service = contentService();
  const city = emailCity(p);
  const lines = isContentFinding(f[0]) && topics?.length
    ? [
        // Owner, 2026-11-18: 3 topics from real Google searches + the real service and price + WhatsApp.
        `Here are 3 blog topics for ${biz(p)}, each based on something people really search for on Google${city ? ` around ${city}` : ""}:`,
        topics
          .slice(0, 3)
          .map((t, i) => `${i + 1}. ${t.title} (people search: ${t.search})`)
          .join("\n"),
        service
          ? `If you'd like posts like these written and published for you every month, that's my ${service.name} service: ${service.price}. It includes the topic research and keeping your pages up to date on Google.`
          : "",
      ]
    : noSite
    ? [
        // Owner, 2026-11-18: no concept link until the premium template is approved; Hamza makes it himself.
        "Great, I'll make it and send it to you within 2 days.",
      ]
    : [
        `Here ${f.length === 1 ? "is the fix" : `are the ${Math.min(3, f.length)} fixes`} I found, in plain words:`,
        f
          .slice(0, 3)
          .map((x, i) => `${i + 1}. ${x.title}: ${x.fix}`)
          .join("\n"),
        reportLink ? `The full report: ${reportLink}` : "",
      ];
  return {
    subject: reSubject(firstSubject),
    body: [hello(p), "Thanks for getting back to me.", ...lines, whatsappLine, SIGNATURE].filter(Boolean).join("\n\n"),
    variant: null,
    source: "template",
  };
};

/** Starting prices, only from src/data/services.ts. */
export const priceLines = () =>
  SERVICES.flatMap((s) => s.pricing.map((t) => `- ${t.name}: from $${t.price.toLocaleString("en-US")}${t.unit ?? ""}`)).join("\n");

/** Automatic answer to a price question: real starting prices + WhatsApp, nothing else. */
export const replyPrice = (p: Prospect, firstSubject: string): Draft => ({
  subject: reSubject(firstSubject),
  body: [
    hello(p),
    "Thanks for asking. These are my starting prices:",
    priceLines(),
    "The final price depends on the features you need.",
    // Owner, 2026-11-18: price answers mention the content service too.
    contentService() ? `If your site already works well, ${contentService()!.name} (${contentService()!.price}) keeps it bringing in new searches with fresh posts every month.` : "",
    whatsappLine,
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
    hello(p),
    "You mentioned the timing wasn't right when I wrote a while ago, so I'm checking back once.",
    f[0]?.id === "no-website" ? `Want me to make a free sample homepage for ${biz(p)}?` : cta(f),
    OPT_OUT,
    "Hamza",
  ].join("\n\n"),
  variant: null,
  source: "template",
});

const reSubject = (s: string) => (/^re:/i.test(s) ? s : `Re: ${s}`);

/**
 * WhatsApp / Instagram message (owner, 2026-11-17): one real problem, one question that says what is
 * offered (never "send it"), signed "Founder, Devrex Digital" like the emails. No links.
 */
export const manualMessage = (
  p: Pick<Prospect, "name" | "business_type" | "osm_tags" | "city"> & { email?: string | null; research?: Prospect["research"]; website?: string | null; audit_score?: number | null },
  audit: AuditResult | null,
) => {
  // Strong sites (70+): the content question, never small fixes (owner, 2026-11-18).
  const content = isContentLead({ website: p.website ?? null, audit_score: p.audit_score ?? null }) ? contentFindings(p.research?.content) : [];
  const f = content.length ? content : findings(audit, ctx(p));
  const intro = `${hello(p)} ${INTRO}`;
  const sign = "Hamza Tariq\nFounder, Devrex Digital";
  if (!f.length) return `${intro}\nWould a few free ideas to get more enquiries from your website be useful?\n\n${sign}`;
  if (f[0].id === "no-website") return `${intro}\nI couldn't find a website for ${biz(p)}, so people searching for ${searchPhrase(p)} find other places first.\nWant me to make you a free sample homepage?\n\n${sign}`;
  return `${intro}\nI had a look at your website and noticed ${f[0].cost}.\n${cta(f)}\n\n${sign}`;
};
