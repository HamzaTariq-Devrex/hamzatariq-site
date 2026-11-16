// "No website" must be verified before a business gets a homepage concept: no website tag on
// OpenStreetMap AND none of its likely domains (name.com, name.co.uk, name.com.au, ...) answers
// with a real site that names the business. Every fetch goes through safeFetch (same SSRF guard as
// the audit tool). A domain that exists but doesn't answer, or a lookup that times out, makes the
// result "uncertain", and the email goes to "Needs a look" instead of being sent.
import { promises as dns } from "node:dns";
import { parse } from "node-html-parser";
import { safeFetch } from "@/lib/audit/safe-fetch";
import type { Country } from "./db";

const TLDS: Record<Country, string[]> = {
  GB: ["co.uk", "uk", "com"],
  AU: ["com.au", "com"],
  NZ: ["co.nz", "nz", "com"],
  AE: ["ae", "com"],
  US: ["com", "net"],
  CA: ["ca", "com"],
};

const STOP = /\b(ltd|limited|llc|llp|plc|inc|co|company|the)\b/g;

const ascii = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "");

/** Name words that identify the business (no legal suffixes, no "the"). */
export const nameWords = (name: string) =>
  ascii(name)
    .replace(STOP, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/** Likely domains for this business name in this country (at most 9). */
export const likelyDomains = (name: string, country: Country) => {
  const w = nameWords(name);
  if (!w.length || w.join("").length < 3) return [];
  // "Smith & Sons" → smithandsons, smith-and-sons and smithsons.
  const noAnd = w.filter((x) => x !== "and");
  const slugs = [...new Set([w.join(""), w.length > 1 ? w.join("-") : "", noAnd.length !== w.length ? noAnd.join("") : ""].filter((x) => x && x.length >= 3 && x.length <= 63))];
  return slugs.flatMap((slug) => TLDS[country].map((tld) => `${slug}.${tld}`)).slice(0, 9);
};

const PARKED = /domain (is )?for sale|buy this domain|this domain (name )?(is|may be) (for sale|parked)|parked (free|domain)|godaddy|sedo|dan\.com|afternic|hugedomains|domain parking|coming soon/i;

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

type DomainResult = { domain: string; state: "none" | "site" | "other" | "uncertain"; url?: string };

const checkDomain = async (domain: string, words: string[]): Promise<DomainResult> => {
  try {
    await withTimeout(dns.lookup(domain), 4000);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return { domain, state: code === "ENOTFOUND" || code === "ENODATA" ? "none" : "uncertain" };
  }
  try {
    const page = await safeFetch(new URL(`https://${domain}/`), { maxBytes: 512 * 1024, timeoutMs: 7000 });
    if (page.status >= 400) return { domain, state: "other" };
    const root = parse(page.body, { comment: false });
    const text = ascii(`${root.querySelector("title")?.textContent ?? ""} ${root.textContent}`).replace(/\s+/g, " ");
    if (PARKED.test(text) && text.length < 4000) return { domain, state: "other" };
    // A real site for this business names it: every name word (or the first two) appears on the page.
    const key = words.length > 2 ? words.slice(0, 2) : words;
    return key.every((w) => text.includes(w)) ? { domain, state: "site", url: page.url } : { domain, state: "other" };
  } catch {
    // The domain exists but doesn't answer: could be their site, temporarily down.
    return { domain, state: "uncertain" };
  }
};

/**
 * "none": no likely domain is theirs (verified no website). "found": a real site that names the
 * business (its URL). "uncertain": the name gives no usable domain, or a check couldn't finish.
 */
export const verifyNoWebsite = async (name: string, country: Country): Promise<{ result: "none" | "found" | "uncertain"; url?: string; checked: string[] }> => {
  const domains = likelyDomains(name, country);
  if (!domains.length) return { result: "uncertain", checked: [] };
  const words = nameWords(name);
  const results = await Promise.all(domains.map((d) => checkDomain(d, words)));
  const site = results.find((r) => r.state === "site");
  if (site) return { result: "found", url: site.url, checked: domains };
  return { result: results.some((r) => r.state === "uncertain") ? "uncertain" : "none", checked: domains };
};
