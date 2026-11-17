// Research before every email 1 (owner, 2026-11-17). Free sources only: the business's own website
// (home, About, Services/Products, Contact pages) and its public OpenStreetMap tags.
//
// 1. Active check. A website must load and show signs of life: a copyright year of 2025 or later,
//    recent dates/posts, products or a menu, or a working contact page. Parked, "coming soon",
//    suspended and clearly dead sites are skipped. A business without a website must have opening
//    hours or a phone number on OSM and no closed/disused tags.
// 2. A private research note written by Gemini from the page text: what they sell or do, their area,
//    their customers, the owner's first name when clearly shown, and specific true facts. Each fact
//    comes with a quote from the site; anything not found word for word in the pages is dropped.
// 3. One personal line for email 1 ("I saw you make custom engagement rings in Hatton Garden."),
//    built only from a verified fact, checkable on their site, no flattery. Nothing specific → no line.
// 4. Quality score: active signals + size fit + how much a better site would help.
import { parse } from "node-html-parser";
import fs from "node:fs";
import path from "node:path";
import { AiUnavailable, outreachJson } from "./ai";
import { normalizeUrl, safeFetch, type FetchResult } from "@/lib/audit/safe-fetch";
import type { AuditResult } from "@/lib/audit/types";
import type { Prospect } from "./db";
import { nounFor, takesBookings } from "./osm-types";
import { findings, mobileSeconds } from "./problems";
import { COMPANY_NAME } from "./checks";

export type Research = {
  /** The active check passed. */
  active: boolean;
  /** Signs of life found (or why the business looks inactive). */
  signals: string[];
  inactiveReason?: string;
  /** Private note for /admin and replies (2-4 plain sentences). Absent when the check failed. */
  note?: string;
  sells?: string | null;
  area?: string | null;
  customers?: string | null;
  /** Owner's first name, only when the site clearly names the owner/founder. */
  owner?: string | null;
  /** Specific true facts, each with the exact words from the site. */
  facts?: { fact: string; quote: string }[];
  /** Email 1 opening line, or null when nothing specific and checkable was found. */
  line?: string | null;
  /** Pages read. */
  sources?: string[];
  quality?: { total: number; active: number; size: number; gain: number };
  /** The AI writer didn't answer: attempts so far (retried on later ticks, up to 3). */
  pending?: number;
  /** Waiting for the outreach Gemini budget or a back-off (not counted as an attempt). */
  wait?: string;
  /** Email-1 middle written in the same Gemini call (checked in code before use). */
  middle?: string | null;
  at: string;
};

const YEAR_NOW = new Date().getUTCFullYear();

/** Visible text of a page (scripts, styles and templates removed), whitespace collapsed. */
export const pageText = (html: string) => {
  const root = parse(html, { comment: false });
  for (const n of root.querySelectorAll("script, style, noscript, template, svg")) n.remove();
  return (root.querySelector("body") ?? root).textContent.replace(/\s+/g, " ").trim();
};

const PARKED =
  /domain (name )?(is )?for sale|buy this domain|this domain (may be|is) (for sale|parked)|parked (free|domain)|domain parking|coming soon|under construction|launching soon|site (is )?(currently )?(under maintenance|offline)|account (has been )?suspended|this account has been suspended|default web ?page|welcome to nginx|it works!|index of \/|website (is )?expired|hosting (has )?expired|future home of/i;
const CLOSED_TEXT = /\b(permanently closed|we have (now )?closed|we are (now )?closed for good|closed (our doors )?for good|ceased trading|no longer trading|has closed down)\b/i;

/** Latest copyright year in the page, if any ("© 2019-2025" → 2025). */
export const copyrightYear = (text: string) => {
  let best: number | null = null;
  for (const m of text.matchAll(/(?:©|&copy;|\(c\)|copyright)[^0-9]{0,40}((?:19|20)\d\d)(?:\s*[-–—/]\s*((?:19|20)\d\d))?/gi)) {
    const y = Math.max(Number(m[1]), Number(m[2] ?? 0));
    if (y <= YEAR_NOW + 1) best = Math.max(best ?? 0, y);
  }
  return best;
};

const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
/** Dates from 2025 on: <time datetime>, "12 March 2025", "March 2025", "12/03/2025". */
export const recentDate = (html: string, text: string) => {
  const min = 2025;
  for (const m of html.matchAll(/<time[^>]*datetime="((?:19|20)\d\d)/gi)) if (Number(m[1]) >= min && Number(m[1]) <= YEAR_NOW) return true;
  const re = new RegExp(`\\b(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?(?:${MONTHS})\\.?,?\\s+((?:19|20)\\d\\d)\\b|\\b\\d{1,2}[/.]\\d{1,2}[/.]((?:19|20)\\d\\d)\\b`, "gi");
  for (const m of text.matchAll(re)) {
    const y = Number(m[1] ?? m[2]);
    if (y >= min && y <= YEAR_NOW) return true;
  }
  return false;
};

/** Signs of life on the home page; null + reason when the site is parked or clearly dead. */
export const activeSignals = (home: FetchResult, extra: { contactWorks: boolean }) => {
  const text = pageText(home.body);
  const title = parse(home.body).querySelector("title")?.textContent ?? "";
  if (home.status >= 400) return { active: false, signals: [], reason: `Website answers ${home.status}` };
  if (PARKED.test(`${title} ${text.slice(0, 1500)}`) && text.length < 3000) return { active: false, signals: [], reason: "Parked, coming-soon or suspended site" };
  if (CLOSED_TEXT.test(text)) return { active: false, signals: [], reason: "The site says the business has closed" };
  if (text.length < 120 && !/<script/i.test(home.body)) return { active: false, signals: [], reason: "Empty page" };
  const signals: string[] = [];
  const year = copyrightYear(text);
  if (year && year >= 2025) signals.push(`copyright ${year}`);
  if (recentDate(home.body, text)) signals.push("recent dates on the page");
  if (/add to (cart|basket|bag)|shop now|buy now|in stock|out of stock/i.test(text) || (text.match(/[£$€]\s?\d+(?:[.,]\d\d)?|\d+(?:\.\d\d)?\s?(?:AED|NZD|AUD)/g) ?? []).length >= 3) signals.push("products with prices");
  if (/\b(our menu|view (the |our )?menu|food menu|drinks menu|lunch menu|dinner menu|takeaway menu)\b/i.test(text) || /href="[^"]*menu/i.test(home.body)) signals.push("menu");
  if (/\b(latest (news|posts)|blog|new arrivals|new in)\b/i.test(text)) signals.push("news or new items");
  const lastMod = Date.parse(home.headers["last-modified"] ?? "");
  if (Number.isFinite(lastMod) && Date.now() - lastMod < 365 * 86_400_000) signals.push("page updated in the last year");
  if (extra.contactWorks) signals.push("working contact page");
  // Clearly dead: an old copyright year and no other sign of life.
  if (year && year <= 2022 && !signals.some((s) => s !== "working contact page"))
    return { active: false, signals, reason: `Looks abandoned (copyright ${year}, nothing recent)` };
  if (!signals.length) return { active: false, signals, reason: "No sign of life (no recent year, posts, products, menu or working contact page)" };
  return { active: true, signals, reason: null };
};

const CLOSED_TAGS = /^(disused|abandoned|was|removed|demolished|razed|closed):/;
/** No-website businesses: opening hours or a phone on OSM, and nothing saying it closed. */
export const osmActive = (tags: Record<string, string>) => {
  if (Object.keys(tags).some((k) => CLOSED_TAGS.test(k))) return { active: false, signals: [], reason: "OpenStreetMap marks it closed or disused" };
  if (tags.end_date || /^(closed|off)$/i.test(tags.opening_hours ?? "") || /\b(closed|permanently closed)\b/i.test(tags.name ?? "")) return { active: false, signals: [], reason: "OpenStreetMap marks it closed" };
  const signals: string[] = [];
  if (tags.opening_hours) signals.push("opening hours on OpenStreetMap");
  if (tags.phone || tags["contact:phone"] || tags["contact:mobile"]) signals.push("phone on OpenStreetMap");
  const check = tags.check_date ?? tags["survey:date"] ?? tags["check_date:opening_hours"];
  if (check && Number(check.slice(0, 4)) >= 2024) signals.push(`checked on OpenStreetMap ${check.slice(0, 7)}`);
  if (tags["contact:facebook"] || tags.facebook || tags["contact:instagram"] || tags.instagram) signals.push("social page linked");
  if (!tags.opening_hours && !(tags.phone || tags["contact:phone"] || tags["contact:mobile"])) return { active: false, signals, reason: "No opening hours or phone on OpenStreetMap" };
  return { active: true, signals, reason: null };
};

/** About, Services/Products and Contact pages linked from the home page (same site, one each). */
export const researchPages = (home: FetchResult) => {
  const base = new URL(home.url);
  const root = parse(home.body, { comment: false });
  const kinds: [string, RegExp][] = [
    ["about", /about|our-story|our story|who-we-are|who we are|meet-the|meet the|history/],
    ["services", /services|treatments|what-we-do|what we do|products|collections?|shop|menu|our-work|bespoke|range/],
    ["contact", /contact|get-in-touch|get in touch|find-us|find us|enquir/],
    ["imprint", /impressum|imprint|legal-notice|legal notice|company-information/],
  ];
  const out = new Map<string, URL>();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    const label = `${href} ${a.textContent}`.toLowerCase();
    for (const [kind, re] of kinds) {
      if (out.has(kind) || !re.test(label)) continue;
      try {
        const u = new URL(href, base);
        u.hash = "";
        if (!/^https?:$/.test(u.protocol) || u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "") || u.toString() === base.toString()) continue;
        if (/\.(pdf|jpe?g|png|webp|zip)$/i.test(u.pathname)) continue;
        out.set(kind, u);
      } catch {
        // bad link
      }
      break;
    }
  }
  return out;
};

const fetchPage = async (u: URL) => {
  try {
    const p = await safeFetch(u, { maxBytes: 1024 * 1024, timeoutMs: 8000 });
    return p.status === 200 ? p : null;
  } catch {
    return null;
  }
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(
  "the and for you your our are with that this from have has was were they them their there what which who will would about into over also just more most very much many some such only than then when where while make makes made sell sells selling offer offers offering provide provides providing based saw see noticed notice local business businesses people customers clients services service products product range".split(
    " ",
  ),
);
const FLATTERY = /\b(amazing|beautiful|stunning|gorgeous|lovely|love|loved|impressive|impressed|fantastic|wonderful|incredible|awesome|great|best|brilliant|excellent|perfect|outstanding|exceptional|superb|delightful)\b/i;

/**
 * The personal line passes only if every content word in it appears in the pages we read (plus the
 * business name, its city and area), it is one short sentence, and it has no flattery or question.
 */
export const verifyLine = (line: string, corpus: string, extra: string[]) => {
  const l = line.trim();
  if (!/^I (saw|noticed|see|read)\b/.test(l)) return "must start with 'I saw' or 'I noticed'";
  if (l.split(/\s+/).length > 22) return "too long";
  if (/[?!]/.test(l) || (l.match(/[.]/g) ?? []).length > 1) return "one plain sentence only";
  if (FLATTERY.test(l)) return "flattery";
  if (/\b(seo|website|google|online|instagram|facebook|reviews?)\b/i.test(l)) return "about their site, not their business";
  const known = norm(`${corpus} ${extra.join(" ")}`);
  const words = norm(l)
    .split(" ")
    .slice(2)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  const missing = words.filter((w) => !known.includes(w.replace(/'s$/, "")) && !known.includes(w.replace(/s$/, "")));
  if (missing.length) return `not on their site: ${missing.join(", ")}`;
  return null;
};

/** Owner's first name only when the text names them as owner/founder (and the word is a name, not a word of the business). */
const verifyOwner = (name: string | null | undefined, corpus: string, businessName: string) => {
  const n = (name ?? "").trim().split(/\s+/)[0];
  if (!/^[A-Z][a-z]{1,19}$/.test(n)) return null;
  if (norm(businessName).split(" ").includes(n.toLowerCase())) return null;
  const re = new RegExp(
    `(owner|founder|co-founder|proprietor|director|managing director|run by|founded by|established by|i'm|i am|my name is|hi,? i'm)[^.]{0,40}\\b${n}\\b|\\b${n}\\b[^.]{0,40}(owner|founder|proprietor|director)`,
    "i",
  );
  return re.test(corpus) ? n : null;
};

type GeminiNote = {
  sells?: string;
  area?: string;
  customers?: string;
  owner_first_name?: string | null;
  facts?: { fact: string; quote: string }[];
  line?: string | null;
  note?: string;
  /** Email 1 middle part (who Hamza is + the one problem), written in the same call. */
  middle?: string;
};

/** Owner's profile (background for the email middle). */
let profileCache: string | null = null;
const ownerProfile = () => {
  if (profileCache !== null) return profileCache;
  try {
    profileCache = fs.readFileSync(path.join(process.cwd(), "content/owner/profile.md"), "utf8").slice(0, 3000);
  } catch {
    profileCache = "";
  }
  return profileCache;
};

/**
 * ONE Flash-Lite call per lead (owner, 2026-11-18): the research note AND the email-1 middle in a
 * single JSON answer. Throws AiUnavailable (budget, back-off, busy); the caller retries on a later tick.
 */
const askGemini = async (p: Pick<Prospect, "name" | "city" | "business_type" | "osm_tags">, pages: { kind: string; url: string; text: string }[], problem: string | null) => {
  const system = `You research a small business from its own website text and write part of a short cold email. Facts only from the text given; never guess.
Return JSON:
{"sells": what they sell or do (short), "area": the area/neighbourhood they serve if stated, "customers": who their customers are if stated,
 "owner_first_name": the owner's or founder's first name ONLY if the text clearly says who owns/founded/runs it, else null,
 "facts": up to 3 specific things that make them different, each {"fact": plain words, "quote": the exact words copied from the text that prove it},
 "line": ONE sentence starting "I saw" that mentions one specific fact (what they make or do, and where if stated), e.g. "I saw you make custom engagement rings in Hatton Garden." Max 18 words. No praise or adjectives like amazing/beautiful/great, no question, nothing about their website. Use only words from the text. If nothing specific, null.
 "note": 2-3 plain sentences about the business only (what they do, where, for whom, what stands out), for Hamza to read; never mention Hamza, websites or the email,
 "middle": ${
   problem
     ? `the middle of Hamza's cold email, 22-32 words, plain friendly English, 1-2 sentences, coming right after the "line". First say who Hamza is in a few words (a web developer who helps small businesses), then explain this ONE problem with their website as what it costs them: "${problem}". Keep its meaning and any number exactly; no other problem; no greeting, sign-off, question, link, web address or technical word (no SEO, H1, meta, schema, SSL, speed scores); never invent results, clients, prices or claims`
     : "null"
 }}
HAMZA'S PROFILE (background only)
${ownerProfile()}`;
  const body = pages.map((x) => `--- ${x.kind.toUpperCase()} PAGE (${x.url})\n${x.text.slice(0, 3000)}`).join("\n\n");
  return outreachJson<GeminiNote>({
    system,
    user: `Business: ${p.name} (${nounFor(p.business_type, p.osm_tags ?? {})}${p.city ? `, ${p.city}` : ""})\n\n${body}`,
    maxTokens: 900,
    temperature: 0.3,
    timeoutMs: 20_000,
  });
};

/** Quality score 0-100: active signals (0-30) + size fit (0-25) + how much a better site would help (0-45). */
export const qualityScore = (p: Pick<Prospect, "website" | "phone" | "osm_tags" | "name">, audit: AuditResult | null, signals: string[], pagesFound: number) => {
  const active = Math.min(30, signals.length * 9 + (signals.some((s) => s.startsWith("copyright 202")) ? 3 : 0));
  let size = 10;
  const tags = p.osm_tags ?? {};
  if (tags["addr:street"] || tags["addr:postcode"]) size += 5;
  if (p.phone) size += 4;
  if (COMPANY_NAME.test(p.name)) size += 3;
  if (pagesFound >= 2 || !p.website) size += 3;
  let gain = 0;
  if (!p.website || !audit) gain = 40;
  else {
    gain += audit.score < 40 ? 22 : audit.score < 50 ? 18 : audit.score < 70 ? 11 : 5;
    const secs = mobileSeconds(audit);
    if (secs !== null && secs >= 4) gain += 8;
    if (audit.checks.find((c) => c.id === "viewport")?.status === "fail") gain += 8;
    if (audit.extras && !audit.extras.hasContactButton) gain += 5;
    if (audit.checks.some((c) => (c.id === "title" || c.id === "description") && c.status !== "pass")) gain += 2;
  }
  size = Math.min(25, size);
  gain = Math.min(45, gain);
  return { total: Math.min(100, active + size + gain), active, size, gain };
};

/**
 * Research one prospect (status "audited"). Returns the research to store; `active: false` means skip.
 */
export const researchProspect = async (p: Prospect, audit: AuditResult | null, deadline = Number.POSITIVE_INFINITY, attempt = 1): Promise<Research> => {
  const at = new Date().toISOString();
  if (!p.website) {
    const a = osmActive(p.osm_tags ?? {});
    if (!a.active) return { active: false, signals: a.signals, inactiveReason: a.reason ?? undefined, at };
    const t = p.osm_tags ?? {};
    const sells = [t.cuisine && `${t.cuisine.replace(/_/g, " ").replace(/;/g, ", ")} food`, t.craft, t.shop && t.shop !== "yes" ? t.shop.replace(/_/g, " ") : null].filter(Boolean).join(", ") || nounFor(p.business_type, t);
    const area = t["addr:suburb"] ?? t["addr:district"] ?? t["addr:city"] ?? p.city;
    return {
      active: true,
      signals: a.signals,
      note: `No website found. OpenStreetMap lists it as ${sells}${area ? ` in ${area}` : ""}${t.opening_hours ? `, open ${t.opening_hours}` : ""}.`,
      sells,
      area: area ?? null,
      customers: null,
      owner: null,
      facts: [],
      line: null,
      sources: ["OpenStreetMap"],
      quality: qualityScore(p, null, a.signals, 0),
      at,
    };
  }
  let home: FetchResult | null = null;
  try {
    home = await safeFetch(normalizeUrl(p.website), { maxBytes: 2 * 1024 * 1024, timeoutMs: 9000 });
  } catch {
    home = null;
  }
  if (!home) return { active: false, signals: [], inactiveReason: "Website didn't load during research", at };
  const links = researchPages(home);
  const fetched = await Promise.all([...links.entries()].filter(([k]) => k !== "imprint").map(async ([kind, u]) => ({ kind, url: u.toString(), page: await fetchPage(u) })));
  const contact = fetched.find((x) => x.kind === "contact")?.page;
  const contactWorks = !!contact && (/<form/i.test(contact.body) || /tel:|mailto:|@/.test(contact.body));
  const a = activeSignals(home, { contactWorks });
  if (!a.active) return { active: false, signals: a.signals, inactiveReason: a.reason ?? undefined, at };

  const pages = [{ kind: "home", url: home.url, text: pageText(home.body) }, ...fetched.filter((x) => x.page && x.kind !== "contact").map((x) => ({ kind: x.kind, url: x.url, text: pageText(x.page!.body) }))];
  const corpus = pages.map((x) => x.text).join(" ");
  const extra = [p.name, p.city ?? "", p.region ?? "", p.osm_tags?.["addr:suburb"] ?? "", p.osm_tags?.["addr:street"] ?? ""];
  const quality = qualityScore(p, audit, a.signals, pages.length);
  const base: Research = { active: true, signals: a.signals, sources: pages.map((x) => x.url), quality, at };

  void deadline;
  const top = findings(audit, { noun: nounFor(p.business_type, p.osm_tags ?? {}), city: p.city, bookings: takesBookings(p.business_type) })[0];
  let g: GeminiNote;
  try {
    g = await askGemini(p, pages, top && top.id !== "no-website" ? top.cost : null);
  } catch (e) {
    const reason = e instanceof AiUnavailable ? e.reason : "error";
    // No budget left today or a back-off running: wait (doesn't count as an attempt).
    if (reason === "budget" || reason === "backoff" || reason === "no-key") return { ...base, pending: attempt - 1, wait: reason, line: null, facts: [] };
    // Busy or a failed answer: try again on a later tick; after 3 attempts the email goes without a line.
    if (attempt < 3) return { ...base, pending: attempt, line: null, facts: [] };
    return { ...base, note: "Research note unavailable (the AI writer didn't answer 3 times); no personal line.", line: null, facts: [] };
  }
  const ncorpus = norm(corpus);
  const facts = (g.facts ?? []).filter((f) => f?.quote && f.quote.length >= 6 && ncorpus.includes(norm(f.quote))).slice(0, 3);
  let line = g.line ? g.line.trim() : null;
  // A line that fails the check is dropped (no line rather than a generic one; no extra call).
  if (line && verifyLine(line, corpus, extra)) line = null;
  if (line && !/[.]$/.test(line)) line += ".";
  return {
    ...base,
    note: (g.note ?? "").slice(0, 600) || undefined,
    sells: g.sells?.slice(0, 160) ?? null,
    area: g.area?.slice(0, 120) ?? null,
    customers: g.customers?.slice(0, 160) ?? null,
    owner: verifyOwner(g.owner_first_name, corpus, p.name),
    facts,
    line,
    middle: g.middle?.trim().slice(0, 600) || null,
  };
};
