// Qualifies one prospect: audits the website with the existing audit engine (same SSRF guard),
// reads the site's own home page and contact/about page for a publicly listed email (mailto links
// or text), its phone/WhatsApp and Instagram links, checks the email domain has a mail server (MX),
// applies the skip rules and scores the lead. No guessed addresses, no third-party lookups.
import { hasMailServer } from "./mx";
import { emailProblem } from "./email-check";
import { parse } from "node-html-parser";
import { runAudit } from "@/lib/audit/run";
import { AuditFetchError, normalizeUrl, safeFetch, type FetchResult } from "@/lib/audit/safe-fetch";
import type { AuditExtras, AuditResult } from "@/lib/audit/types";
import { ox, type Prospect } from "./db";
import { CHAIN_LOCATIONS, domainOf, isBigOrganisation, isStoreLocatorPage, instagramOf, normalizeInstagram } from "./osm";
import { verifyNoWebsite } from "./site-check";
import { COMPANY_PAGE, type Flags } from "./checks";
import { waitingForAddress } from "./address";
import { findings, mobileSeconds } from "./problems";
import { nounFor, takesBookings } from "./osm-types";

export const MAX_AUDIT_SCORE = 85;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
// Australian and Canadian anti-spam rules: a page that says it doesn't want unsolicited email is respected.
const NO_SOLICITING = /(no|not accept|do not send|don't send)[^.]{0,40}(unsolicited|marketing|sales|solicitation|cold)[^.]{0,20}(e-?mails?|messages?|calls?|enquir|offers?)?/i;

export const isShopify = (page: FetchResult) =>
  /cdn\.shopify\.com|Shopify\.theme|myshopify\.com|shopify-section/i.test(page.body) || Object.keys(page.headers).some((h) => h.startsWith("x-shopify") || h === "x-shopid");

const sameSite = (a: string, b: string) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

/** Contact, about and imprint/legal pages linked from the home page, on the same site (contact first, at most 3). */
export const contactPages = (page: FetchResult) => {
  const base = new URL(page.url);
  const root = parse(page.body, { comment: false });
  const found = new Map<string, number>();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    const label = `${href} ${a.textContent}`.toLowerCase();
    const rank = /contact|get-in-touch|get in touch|kontakt|enquir|find-us|find us/.test(label) ? 0 : /about|our-story|who-we-are/.test(label) ? 1 : /impressum|imprint|legal|terms|privacy|company-info/.test(label) ? 2 : -1;
    if (rank < 0) continue;
    try {
      const u = new URL(href, base);
      u.hash = "";
      if (!/^https?:$/.test(u.protocol) || !sameSite(u.hostname, base.hostname) || u.toString() === base.toString()) continue;
      const key = u.toString();
      if (!found.has(key) || found.get(key)! > rank) found.set(key, rank);
    } catch {
      // ignore bad links
    }
  }
  // One page per kind: contact, about, imprint/legal.
  const best = new Map<number, string>();
  for (const [u, r] of [...found.entries()].sort((x, y) => x[1] - y[1])) if (!best.has(r)) best.set(r, u);
  return [...best.entries()].sort((x, y) => x[0] - y[0]).map(([, u]) => new URL(u));
};

/** Cloudflare's email protection: the address is published, only hex-encoded in data-cfemail. */
const decodeCfEmail = (hex: string) => {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  } catch {
    return "";
  }
};

/**
 * Emails actually published in the page: mailto links, plain text (footer included), addresses
 * written as "name [at] domain [dot] com", and Cloudflare-protected ones. Never guessed.
 */
const emailsIn = (html: string) => {
  const root = parse(html, { comment: false });
  const out = new Set<string>();
  for (const a of root.querySelectorAll('a[href^="mailto:"]')) {
    const e = decodeURIComponent((a.getAttribute("href") ?? "").slice(7).split("?")[0]).trim().toLowerCase();
    if (e) out.add(e);
  }
  const text = root.textContent.replace(/\s*[[(]\s*at\s*[\])]\s*/gi, "@").replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".");
  for (const m of text.matchAll(EMAIL_RE)) out.add(m[0].toLowerCase());
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]{6,})"/gi)) {
    const e = decodeCfEmail(m[1]).toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) out.add(e);
  }
  return [...out].filter((e) => !emailProblem(e));
};

const pickEmail = (emails: string[], domain: string | null) => (domain ? emails.find((e) => e.endsWith(`@${domain}`) || e.endsWith(`.${domain}`)) : undefined) ?? emails[0] ?? null;

/** Publicly listed email: the home page (footer included) first, then the Contact, About and Imprint/legal pages. */
export const findPublicEmail = async (home: FetchResult, domain: string | null) => {
  const onHome = emailsIn(home.body);
  if (onHome.length) return { email: pickEmail(onHome, domain), noSoliciting: NO_SOLICITING.test(parse(home.body).textContent) };
  for (const url of contactPages(home)) {
    let page: FetchResult;
    try {
      page = await safeFetch(url, { maxBytes: 1024 * 1024, timeoutMs: 8000 });
    } catch {
      continue;
    }
    if (page.status !== 200) continue;
    if (NO_SOLICITING.test(parse(page.body).textContent)) return { email: null, noSoliciting: true };
    const emails = emailsIn(page.body);
    if (emails.length) return { email: pickEmail(emails, domain), noSoliciting: false };
  }
  return { email: null, noSoliciting: false };
};

/**
 * The email in the business's public Facebook page "About" text, when OSM links the page. Facebook
 * often shows servers a login wall; then nothing is found (never guessed).
 */
export const facebookEmail = async (tags: Record<string, string>, domain: string | null) => {
  const raw = (tags["contact:facebook"] ?? tags.facebook ?? "").split(";")[0].trim();
  if (!raw) return null;
  const url = /^https?:\/\//i.test(raw) ? raw : /^[\w.-]+$/.test(raw) ? `https://www.facebook.com/${raw}` : null;
  try {
    if (!url || !/(^|\.)facebook\.com$/i.test(new URL(url).hostname)) return null;
    const page = await safeFetch(new URL(url), { maxBytes: 1024 * 1024, timeoutMs: 8000 });
    if (page.status !== 200) return null;
    const meta = [...page.body.matchAll(/<meta[^>]+(?:name|property)="(?:og:)?description"[^>]+content="([^"]*)"/gi)].map((m) => m[1]).join(" ");
    const emails = [...new Set([...`${meta} ${page.body}`.matchAll(EMAIL_RE)].map((m) => m[0].toLowerCase()))].filter((e) => !emailProblem(e) && !/facebook|fbcdn|meta\.com/.test(e));
    return pickEmail(emails, domain);
  } catch {
    return null;
  }
};

/** What the home page offers: contact/WhatsApp/booking buttons and the Instagram link. */
export const homeExtras = (home: FetchResult): AuditExtras & { phone: string | null } => {
  const root = parse(home.body, { comment: false });
  let hasContactButton = false;
  let hasWhatsapp = false;
  let instagram: string | null = null;
  let phone: string | null = null;
  for (const a of root.querySelectorAll("a[href]")) {
    const href = (a.getAttribute("href") ?? "").trim();
    const text = a.textContent.toLowerCase();
    if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com\/send)/i.test(href)) {
      hasWhatsapp = true;
      hasContactButton = true;
      const digits = href.match(/(?:wa\.me\/|phone=)(\d{7,15})/)?.[1];
      if (digits && !phone) phone = `+${digits}`;
    }
    if (/^tel:/i.test(href)) {
      hasContactButton = true;
      phone ??= decodeURIComponent(href.slice(4)).trim() || null;
    }
    if (/^mailto:/i.test(href) || /contact|book|appointment|reserv|enquir|quote/.test(`${href.toLowerCase()} ${text}`)) hasContactButton = true;
    if (!instagram && /instagram\.com\//i.test(href)) instagram = normalizeInstagram(href);
  }
  return { hasContactButton, hasWhatsapp, instagram, phone };
};

export { hasMailServer } from "./mx";

/** Characters of visible text in the raw HTML (scripts and styles removed). */
const visibleTextLength = (html: string) => {
  const root = parse(html, { comment: false });
  for (const n of root.querySelectorAll("script, style, noscript, template")) n.remove();
  return (root.querySelector("body") ?? root).textContent.replace(/\s+/g, " ").trim().length;
};

/**
 * 0–100, higher = more to gain and easier to help: no or weak website, slow on mobile, no contact or
 * WhatsApp button, missing title/description, not mobile friendly; plus signs of a real local business.
 */
export const leadScore = (p: Prospect, audit: AuditResult | null) => {
  let s = 30;
  if (!p.website || !audit) s += 40;
  else {
    s += audit.score < 50 ? 18 : audit.score < 70 ? 10 : 4;
    const secs = mobileSeconds(audit);
    if (secs !== null && secs >= 4) s += 10;
    if (audit.checks.find((c) => c.id === "viewport")?.status === "fail") s += 10;
    if (audit.extras && !audit.extras.hasContactButton) s += 8;
    if (audit.checks.some((c) => (c.id === "title" || c.id === "description") && (c.status === "fail" || c.status === "warn"))) s += 6;
  }
  if (p.phone) s += 2;
  if (p.osm_tags["opening_hours"]) s += 2;
  if (p.osm_tags["addr:street"] || p.osm_tags["addr:postcode"]) s += 2;
  return Math.max(0, Math.min(100, s));
};

const skip = (p: Prospect, reason: string) => ox.updateProspect(p.id, { status: "skipped", skip_reason: reason });

/** Runs the whole qualification for one prospect, stores the outcome and when it finished (funnel). */
export const qualify = async (p: Prospect): Promise<string> => {
  const out = await qualifyOne(p);
  await ox.updateProspect(p.id, { checked_at: new Date().toISOString() });
  return out;
};

const qualifyOne = async (p: Prospect): Promise<string> => {
  // Chains, franchises, big brands, government, schools and hospitals: never.
  // US and Canada wait (kept, not skipped) until a postal address is set (CAN-SPAM / CASL).
  if (waitingForAddress(p.country)) {
    await ox.updateProspect(p.id, { status: "waiting", skip_reason: "Waiting for a postal address (CAN-SPAM / CASL)" });
    return "waiting for address";
  }
  if (isBigOrganisation(p.osm_tags, p.name)) return skip(p, "Chain, brand or public body").then(() => "skipped");
  if (isStoreLocatorPage(p.website)) return skip(p, "Store-locator page of a bigger site").then(() => "skipped");
  if ((await ox.nameCount(p.name)) >= CHAIN_LOCATIONS) return skip(p, `Same name at ${CHAIN_LOCATIONS}+ locations (chain)`).then(() => "skipped");
  const osmInstagram = instagramOf(p.osm_tags);

  if (!p.website) {
    let email = p.email && !emailProblem(p.email) && (await hasMailServer(p.email)) ? p.email : null;
    let source: "osm" | "facebook" | null = email ? "osm" : null;
    if (!email) {
      const fb = await facebookEmail(p.osm_tags ?? {}, null);
      if (fb && (await hasMailServer(fb))) {
        email = fb;
        source = "facebook";
      }
    }
    if (email && (await ox.isSuppressed(email, p.id))) return skip(p, "Suppressed or already contacted").then(() => "skipped");
    if (!email && !p.phone && !osmInstagram) return skip(p, "No website, email, phone or Instagram").then(() => "skipped");
    // "No website" is verified: none of the likely domains (name.com, name.co.uk, ...) is theirs.
    const check = await verifyNoWebsite(p.name, p.country);
    if (check.result === "found" && check.url) {
      await ox.updateProspect(p.id, { website: check.url, domain: domainOf(check.url) });
      return qualifyOne({ ...p, website: check.url, domain: domainOf(check.url) });
    }
    const flags: Flags = { noSite: check.result === "none" ? "verified" : "uncertain" };
    await ox.saveAudit(p.id, "", null, null, null);
    // A one-page homepage concept from their public OSM details (/preview/<id>, 30 days).
    await ox.createPreview(p.id);
    // No email: Hamza messages them himself on WhatsApp or Instagram.
    await ox.updateProspect(p.id, {
      status: email ? "audited" : "whatsapp",
      email: email ?? "",
      email_source: source,
      instagram: osmInstagram,
      skip_reason: null,
      lead_score: leadScore(p, null),
      flags,
      ...(email ? { qualified_at: new Date().toISOString() } : {}),
    });
    return email ? `audited (no website, ${flags.noSite})` : "WhatsApp/Instagram queue (no website)";
  }

  let home: FetchResult | null = null;
  let audit: AuditResult;
  try {
    audit = await runAudit(normalizeUrl(p.website), (page) => (home = page), { pagespeedTimeoutMs: 15_000, screenshot: true });
  } catch (e) {
    return skip(p, e instanceof AuditFetchError ? `Website: ${e.message}` : "Website could not be audited").then(() => "skipped");
  }
  const page = home as FetchResult | null;
  if (page && isShopify(page)) return skip(p, "Shopify store").then(() => "skipped");
  if (audit.score >= MAX_AUDIT_SCORE) {
    await ox.updateProspect(p.id, { audit_score: audit.score });
    return skip(p, `Audit score ${audit.score} (85+)`).then(() => "skipped");
  }

  const extras = page ? homeExtras(page) : null;
  if (extras) audit.extras = { hasContactButton: extras.hasContactButton, hasWhatsapp: extras.hasWhatsapp, instagram: extras.instagram };
  const instagram = extras?.instagram ?? osmInstagram;
  const phone = p.phone ?? extras?.phone ?? null;
  // Nothing real to say: no finding we can name in plain words.
  if (!findings(audit, { noun: nounFor(p.business_type, p.osm_tags), city: p.city, bookings: takesBookings(p.business_type) }).length) {
    await ox.updateProspect(p.id, { audit_score: audit.score });
    return skip(p, "No clear problem to mention").then(() => "skipped");
  }

  // An unusable OSM address (no-reply, placeholder, free-mail look-alike) is dropped; the site may list a real one.
  let email = p.email && !emailProblem(p.email) ? p.email : null;
  let source: "osm" | "contact-page" | "facebook" | null = email ? "osm" : null;
  if (page) {
    const found = await findPublicEmail(page, p.domain);
    if (found.noSoliciting) return skip(p, "Site asks for no unsolicited email").then(() => "skipped");
    if (!email && found.email) {
      email = found.email;
      source = "contact-page";
    }
  }
  if (!email) {
    const fb = await facebookEmail(p.osm_tags ?? {}, p.domain);
    if (fb) {
      email = fb;
      source = "facebook";
    }
  }
  if (email && !(await hasMailServer(email))) email = null; // dead domain or typo: dropped
  if (email && (await ox.isSuppressed(email, p.id))) return skip(p, "Suppressed or already contacted").then(() => "skipped");

  await ox.saveAudit(p.id, audit.url, audit.finalUrl, audit.score, audit);
  const score = leadScore({ ...p, phone }, audit);
  // Audit confidence notes for the automatic checks.
  const flags: Flags = {};
  if (page && visibleTextLength(page.body) < 300) flags.jsPage = true;
  if (page && COMPANY_PAGE.test(parse(page.body, { comment: false }).textContent)) flags.companyOnSite = true;
  const from = domainOf(p.website);
  const to = domainOf(audit.finalUrl);
  if (from && to && from !== to && !to.endsWith(`.${from}`) && !from.endsWith(`.${to}`)) flags.redirectOther = to;
  if (!email) {
    if (!phone && !instagram) {
      await ox.updateProspect(p.id, { audit_score: audit.score });
      return skip(p, "No public email, phone or Instagram").then(() => "skipped");
    }
    // Phone or Instagram but no public email: the manual WhatsApp/Instagram queue.
    await ox.updateProspect(p.id, { status: "whatsapp", skip_reason: null, phone, instagram, audit_score: audit.score, lead_score: score, email: "", flags });
    return `WhatsApp/Instagram queue (${audit.score})`;
  }
  await ox.updateProspect(p.id, { status: "audited", email, email_source: source, phone, instagram, audit_score: audit.score, lead_score: score, flags, qualified_at: new Date().toISOString() });
  return `audited (${audit.score})`;
};
