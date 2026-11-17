// Automatic checks that replace daily approval (owner, 2026-11-16). Every email-1 draft goes
// through autoCheck before it is queued, and the cheap checks run again just before sending:
// - reject: a hard rule is broken (link, technical word, wrong length, booking wording for a shop,
//   no real finding, a quote that isn't word for word, chain/brand, no mail server, suppressed,
//   US/Canada without an address). The business is skipped and nothing is sent.
// - review: something is uncertain ("no website" not verified, possible chain, low audit
//   confidence, odd business name). The draft goes to "Needs a look" and expires after 7 days.
// - ok: queued as approved; sent within the daily limit and sending hours.
import { TESTIMONIALS } from "@/lib/testimonials";
import type { AuditResult } from "@/lib/audit/types";
import { ox, type Prospect } from "./db";
import { CHAIN_LOCATIONS, isBigOrganisation, isStoreLocatorPage } from "./osm";
import { isPrimeLocation } from "./areas";
import { takesBookings } from "./osm-types";
import { waitingForAddress } from "./address";
import { hasMailServer } from "./mx";
import { emailProblem } from "./email-check";
import type { Finding } from "./problems";

export type Verdict = { kind: "ok" } | { kind: "review"; reason: string } | { kind: "reject"; reason: string };

/** Prospect flags written by qualification (prospects.flags). */
export type Flags = {
  /** No-website check: verified (no likely domain is theirs), uncertain, or a site was found. */
  noSite?: "verified" | "uncertain";
  /** Home page has almost no text without JavaScript, so the contact-button check may be wrong. */
  jsPage?: boolean;
  /** The website redirects to a different domain (a parent brand, a directory, social media). */
  redirectOther?: string;
  /** The website shows company signs (Ltd/Limited/LLP/PLC, "Registered in England", a company number). */
  companyOnSite?: boolean;
};

/**
 * UK sole traders (owner, 2026-11-16): PECR treats sole traders and partnerships like individuals,
 * so cold email needs their prior consent. Typical one-person trades in the UK without a company
 * sign in the name or on the website are held in "Needs a look" (and expire) instead of sent.
 */
const ONE_PERSON_TRADES = new Set(["plumber", "electrician", "barber", "cleaning", "roofer", "home-services"]);
export const COMPANY_NAME = /\b(ltd|limited|llp|plc|l\.t\.d)\b\.?/i;
export const COMPANY_PAGE = /\b(ltd|limited|llp|plc)\b|registered in (england|scotland|wales|northern ireland)|company (no\.?|number|reg(istration)?( no\.?| number)?)\s*:?\s*\d/i;
export const looksLikeUkSoleTrader = (p: Pick<Prospect, "country" | "business_type" | "name" | "flags">) =>
  p.country === "GB" && ONE_PERSON_TRADES.has(p.business_type) && !COMPANY_NAME.test(p.name) && !(p.flags as Flags | undefined)?.companyOnSite;

const CHAIN_WORDS = /\b(group|holdings|international|franchise|worldwide|global|nationwide|national|express|outlet|superstore|megastore)\b/i;

/** The name without symbols, for emails ("Joe's @ Home!!" → "Joe's Home"). Letters of any script stay. */
export const cleanName = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s&'’.,\-()]/gu, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s&.,-]+|[\s&,-]+$/g, "")
    .trim();

/** Names that would read oddly in "Hi {name} team," or don't look like a business name. */
export const oddName = (name: string) => {
  const n = name.trim();
  if (n.length < 3 || n.length > 60) return "very short or very long";
  if (!/\p{L}{2}/u.test(n)) return "no real words";
  if (/[^\p{Script=Latin}\p{N}\s&'’.,\-()!+/:]/u.test(n)) return "non-Latin letters or symbols";
  if (/https?:|www\.|\.(com|co\.uk|net|org)\b|@/i.test(n)) return "looks like a web or email address";
  if (/^\d/.test(n)) return "starts with a number (looks like an address)";
  if (/\b(test|closed|permanently|temporar(y|ily)|vacant|unknown|n\/a)\b/i.test(n)) return "looks closed or like a placeholder";
  if (n === n.toUpperCase() && n.replace(/[^A-Z]/g, "").length > 14) return "all capitals";
  return null;
};

/**
 * Strong sites (audit 70+). Owner, 2026-11-17 (later the same day): until the SEO + blog offer exists
 * they get a normal email 1 with their most important real finding, so they never block the queue.
 * Kept for labels only; nothing is held on this any more.
 */
export const STRONG_SITE_SCORE = 70;
export const HELD_REASON = (score: number) => `Strong site (audit ${score}): waiting for the SEO + blog offer`;
export const isStrongSite = (p: Pick<Prospect, "audit_score">) => p.audit_score != null && p.audit_score >= STRONG_SITE_SCORE;

/** A website that is a sub-page (not the home page) of a domain: "/royal-exchange-jewellers/". */
export const isSubPage = (url: string) => {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "").toLowerCase();
    return !!path && !/^\/(index(\.\w+)?|home|en|en-gb|uk|gb)$/.test(path);
  } catch {
    return false;
  }
};

/** Every quoted sentence in the email must appear word for word in a real review. */
export const quotesAreReal = (body: string) => {
  const quotes = [...body.matchAll(/"([^"]{8,})"/g)].map((m) => m[1].replace(/…$/, "").trim());
  return quotes.every((q) => TESTIMONIALS.some((t) => t.quote.includes(q)));
};

/** Hard rules, re-checked right before sending (cheap: DNS and database only). */
export const hardChecks = async (p: Prospect): Promise<string | null> => {
  if (!p.email) return "No email address";
  const bad = emailProblem(p.email);
  if (bad) return bad;
  if (waitingForAddress(p.country)) return "US/Canada wait for a postal address";
  if (isBigOrganisation(p.osm_tags ?? {}, p.name)) return "Chain, brand or public body";
  if (isStoreLocatorPage(p.website)) return "Store-locator page of a bigger site";
  if (isPrimeLocation(p.osm_tags ?? {})) return "Prime luxury address (owner, 2026-11-18: skipped)";
  if ((await ox.nameCount(p.name)) >= CHAIN_LOCATIONS) return `Same name at ${CHAIN_LOCATIONS}+ locations (chain)`;
  if (!(await hasMailServer(p.email))) return "Email domain has no mail server";
  if (await ox.isSuppressed(p.email, p.id)) return "Suppressed or already contacted";
  return null;
};

/** The full check for a new email 1. `problems` are the text rules from checkEmail1. */
export const autoCheck = async (p: Prospect, audit: AuditResult | null, f: Finding[], body: string, problems: string[]): Promise<Verdict> => {
  const flags = (p.flags ?? {}) as Flags;
  if (problems.length) return { kind: "reject", reason: `Email rules: ${problems.join("; ")}` };
  if (!f.length) return { kind: "reject", reason: "No real finding from the audit" };
  if (!takesBookings(p.business_type) && /\bbook(s|ed|ing|ings)?\b/i.test(body)) return { kind: "reject", reason: "Booking wording for a business that doesn't take bookings" };
  if (!quotesAreReal(body)) return { kind: "reject", reason: "A quote isn't word for word from a real review" };
  const hard = await hardChecks(p);
  if (hard) return { kind: "reject", reason: hard };

  // Uncertain: a person should look first.
  if (f[0].id === "no-website") {
    // Email 1 for no-website businesses has no link (owner, 2026-11-17), so no concept is needed first.
    if (flags.noSite !== "verified") return { kind: "review", reason: "Couldn't verify that they have no website" };
  } else if (!audit) {
    return { kind: "review", reason: "Low audit confidence: no audit result" };
  }
  // Their "website" is one page on a bigger site (a shopping centre, a directory, a group): the audit
  // is of someone else's site, so a person looks first.
  if (p.website && isSubPage(p.website)) return { kind: "review", reason: "Their website is a page on a bigger site, so the audit may not be theirs" };
  if (p.research?.redirectedTo) return { kind: "review", reason: `Their website now opens ${p.research.redirectedTo}: a different name or business` };
  if (flags.redirectOther) return { kind: "review", reason: `Low audit confidence: the website redirects to ${flags.redirectOther}` };
  if (flags.jsPage && f[0].id === "no-contact") return { kind: "review", reason: "Low audit confidence: the page is built with JavaScript, so the contact-button check may be wrong" };
  if (looksLikeUkSoleTrader(p)) return { kind: "review", reason: "Possible UK sole trader (no Ltd/Limited in the name or on the site): needs prior consent under PECR" };
  // Symbols are dropped from the name in the email (greeting "Hi there," or the person's first name),
  // so only a name that is still odd without them needs a look.
  const odd = oddName(cleanName(p.name));
  if (odd) return { kind: "review", reason: `Odd business name (${odd})` };
  if ((await ox.nameCount(p.name)) >= CHAIN_LOCATIONS - 1) return { kind: "review", reason: "Possible chain: the same name at another location" };
  if (CHAIN_WORDS.test(p.name)) return { kind: "review", reason: "Possible chain: the name sounds like a group or brand" };
  return { kind: "ok" };
};
