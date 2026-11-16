// Our own crawl of every sitemap URL, like a search engine sees it (raw HTML, no JavaScript),
// through safeFetch (the audit engine's SSRF-guarded fetcher), plus link checks.
import { parse, type HTMLElement } from "node-html-parser";
import { AuditFetchError, safeFetch } from "@/lib/audit/safe-fetch";
import { SITE_ORIGIN, templateOf, toPath } from "./config";

/** Paths listed in the live sitemap. */
export const sitemapPaths = async () => {
  const res = await safeFetch(new URL("/sitemap.xml", SITE_ORIGIN), { accept: "application/xml,text/xml;q=0.9,*/*;q=0.5", timeoutMs: 15_000 });
  if (res.status !== 200) throw new Error(`sitemap.xml answered ${res.status}`);
  const paths = [...res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => toPath(m[1].replace(/&amp;/g, "&"))).filter((p): p is string => !!p);
  return [...new Set(paths)].map((path) => ({ path, template: templateOf(path) }));
};

const text = (el: HTMLElement | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const meta = (root: HTMLElement, attr: "name" | "property", value: string) =>
  root.querySelectorAll(`meta[${attr}]`).find((m) => m.getAttribute(attr)?.toLowerCase() === value)?.getAttribute("content")?.trim() ?? "";

const visibleWords = (root: HTMLElement) => {
  const body = root.querySelector("main") ?? root.querySelector("body") ?? root;
  const clone = parse(body.toString());
  clone.querySelectorAll("script, style, noscript, template, svg, iframe").forEach((n) => n.remove());
  return text(clone).split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
};

export type CrawlResult = {
  path: string;
  status: number;
  redirect_to: string | null;
  response_ms: number;
  title: string | null;
  description: string | null;
  canonical: string | null;
  has_og: boolean;
  has_jsonld: boolean;
  noindex: boolean;
  h1_count: number;
  words: number;
  images_missing_alt: number;
  links_out: string[];
  external_links: string[];
};

/** Fetches and reads one page of our site. Network failures come back as status 0. */
export const crawlPage = async (path: string): Promise<CrawlResult> => {
  const t0 = Date.now();
  const empty = { title: null, description: null, canonical: null, has_og: false, has_jsonld: false, noindex: false, h1_count: 0, words: 0, images_missing_alt: 0, links_out: [], external_links: [] };
  let res;
  try {
    res = await safeFetch(new URL(path, SITE_ORIGIN), { timeoutMs: 15_000, maxBytes: 3 * 1024 * 1024 });
  } catch (e) {
    return { path, status: 0, redirect_to: e instanceof AuditFetchError ? e.message : "fetch failed", response_ms: Date.now() - t0, ...empty };
  }
  const response_ms = Date.now() - t0;
  const finalPath = toPath(res.url);
  const redirect_to = res.redirects.length ? (finalPath ?? res.url) : null;
  if (res.status !== 200 || !/html/i.test(res.headers["content-type"] ?? "")) return { path, status: res.status, redirect_to, response_ms, ...empty };

  const root = parse(res.body, { comment: false });
  const robots = `${meta(root, "name", "robots")} ${res.headers["x-robots-tag"] ?? ""}`.toLowerCase();
  const out = new Set<string>();
  const ext = new Set<string>();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href")?.trim() ?? "";
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript|sms|whatsapp):/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href, `${SITE_ORIGIN}${path}`);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    const internal = toPath(url.toString());
    if (internal) {
      if (internal !== path && !internal.startsWith("/_next/") && !/\.(xml|txt|pdf|png|jpe?g|webp|svg|ico)$/i.test(internal)) out.add(internal);
    } else if (!/^(wa\.me|api\.whatsapp\.com)$/i.test(url.hostname)) {
      url.hash = "";
      ext.add(url.toString());
    }
  }
  const imgs = root.querySelectorAll("img");
  return {
    path,
    status: res.status,
    redirect_to,
    response_ms,
    title: text(root.querySelector("title")) || null,
    description: meta(root, "name", "description") || null,
    canonical: root.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() || null,
    has_og: !!meta(root, "property", "og:title") && !!meta(root, "property", "og:image"),
    has_jsonld: root.querySelectorAll('script[type="application/ld+json"]').some((s) => s.textContent.trim().length > 2),
    noindex: /\bnoindex\b/.test(robots),
    h1_count: root.querySelectorAll("h1").length,
    words: visibleWords(root),
    // alt="" is a valid choice for decorative images; only a missing attribute counts.
    images_missing_alt: new Set(imgs.filter((i) => i.getAttribute("alt") === undefined).map((i) => i.getAttribute("src") ?? i.toString())).size,
    links_out: [...out].sort(),
    external_links: [...ext].sort(),
  };
};

/** Status of a link (internal page outside the sitemap, or an outside site). */
export const checkLink = async (url: string): Promise<{ url: string; status: number | null; error: string | null }> => {
  try {
    const res = await safeFetch(new URL(url), { timeoutMs: 10_000, maxBytes: 256 * 1024, maxRedirects: 6 });
    return { url, status: res.status, error: null };
  } catch (e) {
    return { url, status: null, error: e instanceof Error ? e.message : "fetch failed" };
  }
};

/** Runs `fn` over `items` with `limit` in parallel, stopping new work after `deadline`. */
export const pool = async <T, R>(items: T[], limit: number, deadline: number, fn: (item: T) => Promise<R>) => {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length && Date.now() < deadline) {
      const item = items[next++];
      results.push(await fn(item));
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};
