// Qualifies one prospect: audits the website with the existing audit engine (same SSRF guard),
// reads the site's own home page and contact/about page for a publicly listed email (mailto links
// or text), its phone/WhatsApp and Instagram links, checks the email domain has a mail server (MX),
// applies the skip rules and scores the lead. No guessed addresses, no third-party lookups.
import { hasMailServer } from "./mx";
import { parse } from "node-html-parser";
import { runAudit } from "@/lib/audit/run";
import { AuditFetchError, normalizeUrl, safeFetch, type FetchResult } from "@/lib/audit/safe-fetch";
import type { AuditExtras, AuditResult } from "@/lib/audit/types";
import { ox, type Prospect } from "./db";
import { CHAIN_LOCATIONS, domainOf, isBigOrganisation, isStoreLocatorPage, instagramOf, normalizeInstagram } from "./osm";
import { verifyNoWebsite } from "./site-check";
import type { Flags } from "./checks";
import { waitingForAddress } from "./address";
import { findings, mobileSeconds } from "./problems";
import { nounFor, takesBookings } from "./osm-types";

export const MAX_AUDIT_SCORE = 85;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
const BAD_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|@(example|domain|email|yourdomain|sentry|wixpress|sentry-next)\.|^(noreply|no-reply|donotreply)@/i;
// Australian and Canadian anti-spam rules: a page that says it doesn't want unsolicited email is respected.
const NO_SOLICITING = /(no|not accept|do not send|don't send)[^.]{0,40}(unsolicited|marketing|sales|solicitation|cold)[^.]{0,20}(e-?mails?|messages?|calls?|enquir|offers?)?/i;

export const isShopify = (page: FetchResult) =>
  /cdn\.shopify\.com|Shopify\.theme|myshopify\.com|shopify-section/i.test(page.body) || Object.keys(page.headers).some((h) => h.startsWith("x-shopify") || h === "x-shopid");

const sameSite = (a: string, b: string) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

/** Contact and about pages linked from the home page, on the same site (contact first, at most 2). */
export const contactPages = (page: FetchResult) => {
  const base = new URL(page.url);
  const root = parse(page.body, { comment: false });
  const found = new Map<string, number>();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    const label = `${href} ${a.textContent}`.toLowerCase();
    const rank = /contact|get-in-touch|kontakt|enquir/.test(label) ? 0 : /about|impressum/.test(label) ? 1 : -1;
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
  return [...found.entries()].sort((x, y) => x[1] - y[1]).slice(0, 2).map(([u]) => new URL(u));
};

/** Emails actually published in the page: mailto links and plain text. Never guessed. */
const emailsIn = (html: string) => {
  const root = parse(html, { comment: false });
  const out = new Set<string>();
  for (const a of root.querySelectorAll('a[href^="mailto:"]')) {
    const e = decodeURIComponent((a.getAttribute("href") ?? "").slice(7).split("?")[0]).trim().toLowerCase();
    if (e) out.add(e);
  }
  for (const m of root.textContent.matchAll(EMAIL_RE)) out.add(m[0].toLowerCase());
  return [...out].filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) && !BAD_EMAIL.test(e));
};

const pickEmail = (emails: string[], domain: string | null) => (domain ? emails.find((e) => e.endsWith(`@${domain}`) || e.endsWith(`.${domain}`)) : undefined) ?? emails[0] ?? null;

/** Publicly listed email: home page mailto links first, then the site's contact/about page. */
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

/** Runs the whole qualification for one prospect and stores the outcome. */
export const qualify = async (p: Prospect): Promise<string> => {
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
    const email = p.email && (await hasMailServer(p.email)) ? p.email : null;
    if (email && (await ox.isSuppressed(email, p.id))) return skip(p, "Suppressed or already contacted").then(() => "skipped");
    if (!email && !p.phone && !osmInstagram) return skip(p, "No website, email, phone or Instagram").then(() => "skipped");
    // "No website" is verified: none of the likely domains (name.com, name.co.uk, ...) is theirs.
    const check = await verifyNoWebsite(p.name, p.country);
    if (check.result === "found" && check.url) {
      await ox.updateProspect(p.id, { website: check.url, domain: domainOf(check.url) });
      return qualify({ ...p, website: check.url, domain: domainOf(check.url) });
    }
    const flags: Flags = { noSite: check.result === "none" ? "verified" : "uncertain" };
    await ox.saveAudit(p.id, "", null, null, null);
    // A one-page homepage concept from their public OSM details (/preview/<id>, 30 days).
    await ox.createPreview(p.id);
    // No email: Hamza messages them himself on WhatsApp or Instagram.
    await ox.updateProspect(p.id, {
      status: email ? "audited" : "whatsapp",
      email: email ?? "",
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

  let email = p.email;
  let source: "osm" | "contact-page" | null = email ? "osm" : null;
  if (page) {
    const found = await findPublicEmail(page, p.domain);
    if (found.noSoliciting) return skip(p, "Site asks for no unsolicited email").then(() => "skipped");
    if (!email && found.email) {
      email = found.email;
      source = "contact-page";
    }
  }
  if (email && !(await hasMailServer(email))) email = null; // dead domain or typo: dropped
  if (email && (await ox.isSuppressed(email, p.id))) return skip(p, "Suppressed or already contacted").then(() => "skipped");

  await ox.saveAudit(p.id, audit.url, audit.finalUrl, audit.score, audit);
  const score = leadScore({ ...p, phone }, audit);
  // Audit confidence notes for the automatic checks.
  const flags: Flags = {};
  if (page && visibleTextLength(page.body) < 300) flags.jsPage = true;
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
