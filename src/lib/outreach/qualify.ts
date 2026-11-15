// Qualifies one prospect: audits the website with the existing audit engine (same SSRF guard),
// reads ONLY the site's own contact/about page for a publicly listed email (or uses the OSM email
// tag), applies the skip rules and scores the lead. No guessed addresses, no third-party lookups.
import { parse } from "node-html-parser";
import { runAudit } from "@/lib/audit/run";
import { AuditFetchError, normalizeUrl, safeFetch, type FetchResult } from "@/lib/audit/safe-fetch";
import type { AuditResult } from "@/lib/audit/types";
import { ox, type Prospect } from "./db";

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

/** Publicly listed email from the site's own contact/about page; same-domain addresses first. */
export const findPublicEmail = async (home: FetchResult, domain: string | null) => {
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
    const own = domain ? emails.find((e) => e.endsWith(`@${domain}`) || e.endsWith(`.${domain}`)) : undefined;
    if (own || emails[0]) return { email: own ?? emails[0], noSoliciting: false };
  }
  return { email: null, noSoliciting: false };
};

/** 0–100: no website or a weak site and a real, reachable business score high. */
export const leadScore = (p: Prospect, auditScore: number | null) => {
  let s = 40;
  if (!p.website) s += 35;
  else if (auditScore !== null) s += auditScore < 50 ? 35 : auditScore < 70 ? 25 : 12;
  if (p.phone) s += 5;
  if (p.osm_tags["opening_hours"]) s += 5;
  if (p.osm_tags["addr:street"] || p.osm_tags["addr:postcode"]) s += 5;
  if (p.email && p.domain && p.email.endsWith(`@${p.domain}`)) s += 5;
  return Math.max(0, Math.min(100, s));
};

const skip = (p: Prospect, reason: string) => ox.updateProspect(p.id, { status: "skipped", skip_reason: reason });

/** Runs the whole qualification for one prospect and stores the outcome. */
export const qualify = async (p: Prospect): Promise<string> => {
  // National chains and luxury brands (OSM brand tags) have in-house teams: not a fit.
  if (p.osm_tags["brand"] || p.osm_tags["brand:wikidata"]) return skip(p, "Chain or brand store").then(() => "skipped");
  if (!p.website) {
    if (!p.email) {
      if (!p.phone) return skip(p, "No website, email or phone").then(() => "skipped");
      // Phone only: Hamza sends these himself on WhatsApp.
      await ox.saveAudit(p.id, "", null, null, null);
      await ox.updateProspect(p.id, { status: "whatsapp", skip_reason: null, lead_score: leadScore(p, null) });
      return "WhatsApp queue (no website)";
    }
    if (await ox.isSuppressed(p.email, p.id)) return skip(p, "Suppressed or already contacted").then(() => "skipped");
    await ox.saveAudit(p.id, "", null, null, null);
    await ox.updateProspect(p.id, { status: "audited", lead_score: leadScore(p, null) });
    return "audited (no website)";
  }

  let home: FetchResult | null = null;
  let audit: AuditResult;
  try {
    audit = await runAudit(normalizeUrl(p.website), (page) => (home = page), { pagespeedTimeoutMs: 15_000 });
  } catch (e) {
    return skip(p, e instanceof AuditFetchError ? `Website: ${e.message}` : "Website could not be audited").then(() => "skipped");
  }
  const page = home as FetchResult | null;
  if (page && isShopify(page)) return skip(p, "Shopify store").then(() => "skipped");
  if (audit.score >= MAX_AUDIT_SCORE) {
    await ox.updateProspect(p.id, { audit_score: audit.score });
    return skip(p, `Audit score ${audit.score} (85+)`).then(() => "skipped");
  }

  let email = p.email;
  let source: "osm" | "contact-page" | null = email ? "osm" : null;
  if (page) {
    const found = await findPublicEmail(page, p.domain);
    if (found.noSoliciting) return skip(p, "Contact page asks for no unsolicited email").then(() => "skipped");
    if (!email && found.email) {
      email = found.email;
      source = "contact-page";
    }
  }
  if (!email) {
    if (!p.phone) {
      await ox.updateProspect(p.id, { audit_score: audit.score });
      return skip(p, "No public email or phone").then(() => "skipped");
    }
    // Phone but no public email: the WhatsApp queue, with the report link ready for the message.
    await ox.saveAudit(p.id, audit.url, audit.finalUrl, audit.score, audit);
    await ox.updateProspect(p.id, { status: "whatsapp", skip_reason: null, audit_score: audit.score, lead_score: leadScore(p, audit.score) });
    return `WhatsApp queue (${audit.score})`;
  }
  if (await ox.isSuppressed(email, p.id)) return skip(p, "Suppressed or already contacted").then(() => "skipped");

  await ox.saveAudit(p.id, audit.url, audit.finalUrl, audit.score, audit);
  await ox.updateProspect(p.id, { status: "audited", email, email_source: source, audit_score: audit.score, lead_score: leadScore({ ...p, email }, audit.score) });
  return `audited (${audit.score})`;
};
