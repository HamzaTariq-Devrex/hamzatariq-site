// Runs the free SEO audit for one URL: fetches the raw HTML like a crawler (no JavaScript),
// checks it, fetches robots.txt and the sitemap, and runs PageSpeed Insights in parallel.
import { parse, type HTMLElement } from "node-html-parser";
import { AuditFetchError, safeFetch, type FetchResult } from "./safe-fetch";
import { PageSpeedError, runPageSpeed } from "./pagespeed";
import type { AuditResult, Check, CheckStatus, PageSpeed } from "./types";

const FACTOR: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0, skip: 0 };

/** Weighted score out of 100; skipped checks don't count. */
export const scoreOf = (checks: Check[]) => {
  const counted = checks.filter((c) => c.status !== "skip");
  const total = counted.reduce((s, c) => s + c.weight, 0);
  return total ? Math.round((counted.reduce((s, c) => s + c.weight * FACTOR[c.status], 0) / total) * 100) : 0;
};

const text = (el: HTMLElement | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const meta = (root: HTMLElement, attr: "name" | "property", value: string) =>
  root.querySelectorAll(`meta[${attr}]`).find((m) => m.getAttribute(attr)?.toLowerCase() === value)?.getAttribute("content")?.trim() ?? "";
const short = (s: string, max = 90) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

const visibleWords = (root: HTMLElement) => {
  const body = root.querySelector("body") ?? root;
  const clone = parse(body.toString());
  clone.querySelectorAll("script, style, noscript, template, svg, iframe").forEach((n) => n.remove());
  return text(clone).split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
};

const robotsCheck = (robots: FetchResult | null): { check: Check; sitemaps: string[] } => {
  const base = { id: "robots", group: "crawl" as const, label: "robots.txt", weight: 4 };
  const looksHtml = (r: FetchResult) => /text\/html/i.test(r.headers["content-type"] ?? "") || /^\s*<(!doctype|html)/i.test(r.body);
  if (!robots || robots.status !== 200 || looksHtml(robots)) {
    return {
      sitemaps: [],
      check: { ...base, status: "warn", detail: "No robots.txt file was found.", fix: "Add a robots.txt that allows crawling and lists your sitemap with a Sitemap: line." },
    };
  }
  const lines = robots.body.split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim());
  const sitemaps = lines.filter((l) => /^sitemap:/i.test(l)).map((l) => l.slice(8).trim()).filter(Boolean);
  // Rules for "User-agent: *" (or Googlebot) that disallow everything.
  let applies = false;
  let blocksAll = false;
  for (const line of lines) {
    const [k, ...rest] = line.split(":");
    const key = k?.toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") applies = value === "*" || /googlebot/i.test(value);
    else if (applies && key === "disallow" && value === "/") blocksAll = true;
  }
  if (blocksAll) {
    return {
      sitemaps,
      check: { ...base, status: "fail", detail: "robots.txt blocks search engines from the whole site (Disallow: /).", fix: "Remove the Disallow: / rule for all user agents, unless the site really should stay out of Google.", weight: 10 },
    };
  }
  return {
    sitemaps,
    check: {
      ...base,
      status: sitemaps.length ? "pass" : "warn",
      detail: sitemaps.length ? "robots.txt allows crawling and lists a sitemap." : "robots.txt exists but doesn't list your sitemap.",
      fix: sitemaps.length ? undefined : "Add a line like Sitemap: https://yourdomain.com/sitemap.xml to robots.txt.",
    },
  };
};

export const runAudit = async (start: URL): Promise<AuditResult> => {
  const speed: Promise<{ data: PageSpeed | null; note?: string }> = runPageSpeed(start.toString())
    .then((data) => ({ data }))
    .catch((e) => ({ data: null, note: e instanceof PageSpeedError ? e.message : "Google PageSpeed could not test this page, so speed is not part of this score." }));

  const page = await safeFetch(start);
  const finalUrl = new URL(page.url);
  const origin = finalUrl.origin;
  const isHtml = /html/i.test(page.headers["content-type"] ?? "text/html") || /<html/i.test(page.body.slice(0, 2000));
  if (!isHtml) throw new AuditFetchError("That address doesn't return a web page (HTML).");

  const robotsPromise = safeFetch(new URL("/robots.txt", origin), { maxBytes: 256 * 1024, timeoutMs: 6000, accept: "text/plain,*/*;q=0.5" }).catch(() => null);
  const root = parse(page.body, { comment: false });
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // ---- Crawling and security
  add({
    id: "https",
    group: "crawl",
    label: "HTTPS",
    weight: 8,
    ...(finalUrl.protocol === "https:"
      ? { status: "pass", detail: page.redirects.length && start.protocol === "http:" ? "The site redirects to a secure HTTPS address." : "The page is served over HTTPS." }
      : { status: "fail", detail: "The page is served over plain HTTP.", fix: "Install an SSL certificate and redirect every http:// address to https://." }),
  });
  add({
    id: "status",
    group: "crawl",
    label: "Page answers with 200 OK",
    weight: 6,
    ...(page.status === 200
      ? { status: "pass", detail: page.redirects.length ? `OK after ${page.redirects.length} redirect${page.redirects.length > 1 ? "s" : ""}.` : "The page answers with status 200." }
      : { status: "fail", detail: `The page answers with status ${page.status}.`, fix: "Search engines only index pages that answer with status 200. Fix the error or the redirect." }),
  });
  const robotsMeta = `${meta(root, "name", "robots")} ${meta(root, "name", "googlebot")} ${page.headers["x-robots-tag"] ?? ""}`.toLowerCase();
  add({
    id: "noindex",
    group: "crawl",
    label: "Page allows indexing",
    weight: 10,
    ...(/noindex/.test(robotsMeta)
      ? { status: "fail", detail: "The page tells search engines not to index it (noindex).", fix: "Remove noindex from the robots meta tag or the X-Robots-Tag header." }
      : { status: "pass", detail: "No noindex tag found." }),
  });

  // ---- Content Google can read
  const words = visibleWords(root);
  const hasAppRoot = /<div[^>]+id=["'](root|app|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(page.body);
  add({
    id: "ssr",
    group: "content",
    label: "Content in the HTML (server rendering)",
    weight: 15,
    ...(words >= 150
      ? { status: "pass", detail: `The raw HTML already contains your content (about ${words} words). Crawlers can read it without running JavaScript.` }
      : words >= 40
        ? { status: "warn", detail: `The raw HTML has only about ${words} words of text.`, fix: "Make sure your main content is in the HTML the server sends, not added later by JavaScript. Server rendering or static generation (for example with Next.js) fixes this." }
        : {
            status: "fail",
            detail: hasAppRoot
              ? `The HTML is an empty app shell (about ${words} words). The content is built in the browser by JavaScript, so many crawlers see an empty page.`
              : `The raw HTML contains almost no text (about ${words} words).`,
            fix: "Render pages on the server or at build time so each URL returns its real content. For React sites, moving to Next.js is the usual fix.",
          }),
  });
  const h1s = root.querySelectorAll("h1").map(text).filter(Boolean);
  add({
    id: "h1",
    group: "content",
    label: "One clear H1 heading",
    weight: 8,
    ...(h1s.length === 1
      ? { status: "pass", detail: `H1: "${short(h1s[0])}"` }
      : h1s.length > 1
        ? { status: "warn", detail: `${h1s.length} H1 headings found.`, fix: "Use one H1 per page for the main topic, and H2s for sections." }
        : { status: "fail", detail: "No H1 heading in the HTML.", fix: "Add one H1 that says what the page is about, using the words people search for." }),
  });
  const levels = root.querySelectorAll("h1, h2, h3, h4, h5, h6").map((h) => Number(h.tagName.slice(1)));
  const skips = levels.some((l, i) => i > 0 && l - levels[i - 1] > 1);
  const h2count = levels.filter((l) => l === 2).length;
  add({
    id: "headings",
    group: "content",
    label: "Heading structure",
    weight: 3,
    ...(h2count && !skips
      ? { status: "pass", detail: `${h2count} H2 section heading${h2count > 1 ? "s" : ""}, in a logical order.` }
      : { status: "warn", detail: !h2count ? "No H2 section headings found." : "Some heading levels are skipped (for example H2 straight to H4).", fix: "Break the page into sections with H2 headings, and H3s inside them, without skipping levels." }),
  });
  const imgs = root.querySelectorAll("img");
  const noAlt = imgs.filter((i) => i.getAttribute("alt") === undefined).length;
  add({
    id: "alt",
    group: "content",
    label: "Image alt text",
    weight: 5,
    ...(noAlt === 0
      ? { status: "pass", detail: imgs.length ? `All ${imgs.length} images in the HTML have alt text.` : "No images in the HTML to check." }
      : { status: noAlt / imgs.length <= 0.2 ? "warn" : "fail", detail: `${noAlt} of ${imgs.length} images have no alt attribute.`, fix: "Describe each image in its alt attribute. Use alt=\"\" only for purely decorative images." }),
  });
  add({
    id: "lang",
    group: "content",
    label: "Language declared",
    weight: 2,
    ...(root.querySelector("html")?.getAttribute("lang")
      ? { status: "pass", detail: `lang="${root.querySelector("html")!.getAttribute("lang")}"` }
      : { status: "warn", detail: "The <html> tag has no lang attribute.", fix: 'Add the page language, for example <html lang="en">.' }),
  });

  // ---- Titles and meta tags
  const title = text(root.querySelector("head title") ?? root.querySelector("title"));
  add({
    id: "title",
    group: "meta",
    label: "Title tag",
    weight: 10,
    ...(!title
      ? { status: "fail", detail: "The page has no <title>.", fix: "Add a unique title of about 50–60 characters with the page's main keyword." }
      : title.length < 15 || title.length > 65
        ? { status: "warn", detail: `"${short(title)}" (${title.length} characters).`, fix: title.length > 65 ? "Shorten the title to about 60 characters so Google shows it in full." : "Make the title more descriptive: what the page offers and for whom." }
        : { status: "pass", detail: `"${short(title)}" (${title.length} characters).` }),
  });
  const description = meta(root, "name", "description");
  add({
    id: "description",
    group: "meta",
    label: "Meta description",
    weight: 8,
    ...(!description
      ? { status: "fail", detail: "No meta description.", fix: "Add a meta description of 150–160 characters that tells searchers what they get." }
      : description.length < 70 || description.length > 170
        ? { status: "warn", detail: `${description.length} characters: "${short(description)}"`, fix: "Aim for 150–160 characters, so it's long enough to be useful and short enough to show in full." }
        : { status: "pass", detail: `${description.length} characters: "${short(description)}"` }),
  });
  const canonical = root.querySelectorAll("link[rel]").find((l) => l.getAttribute("rel")?.toLowerCase() === "canonical")?.getAttribute("href") ?? "";
  add({
    id: "canonical",
    group: "meta",
    label: "Canonical URL",
    weight: 5,
    ...(canonical
      ? { status: "pass", detail: `Canonical: ${short(new URL(canonical, finalUrl).toString())}` }
      : { status: "warn", detail: "No canonical link tag.", fix: "Add <link rel=\"canonical\"> with the page's preferred address, so duplicates (www, tracking parameters) don't split its ranking." }),
  });
  const viewport = meta(root, "name", "viewport");
  add({
    id: "viewport",
    group: "meta",
    label: "Mobile viewport",
    weight: 6,
    ...(/width\s*=\s*device-width/i.test(viewport)
      ? { status: "pass", detail: "The page is set up for mobile screens." }
      : { status: "fail", detail: viewport ? `Viewport is "${short(viewport)}".` : "No viewport meta tag.", fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">. Google ranks the mobile version of your site.' }),
  });

  // ---- Social previews and structured data
  const og = { title: meta(root, "property", "og:title"), description: meta(root, "property", "og:description"), image: meta(root, "property", "og:image") };
  const ogCount = Object.values(og).filter(Boolean).length;
  add({
    id: "og",
    group: "social",
    label: "Open Graph (link previews)",
    weight: 5,
    ...(ogCount === 3
      ? { status: "pass", detail: "og:title, og:description and og:image are set, so shared links show a proper card." }
      : {
          status: ogCount ? "warn" : "fail",
          detail: ogCount ? `Missing: ${Object.entries(og).filter(([, v]) => !v).map(([k]) => `og:${k}`).join(", ")}.` : "No Open Graph tags.",
          fix: "Add og:title, og:description and og:image so links shared on WhatsApp, LinkedIn and Facebook show a title, text and image.",
        }),
  });
  const types = new Set<string>();
  let badJson = 0;
  const collect = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (node && typeof node === "object") {
      const t = (node as Record<string, unknown>)["@type"];
      (Array.isArray(t) ? t : [t]).forEach((x) => typeof x === "string" && types.add(x));
      Object.values(node).forEach(collect);
    }
  };
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collect(JSON.parse(s.textContent));
    } catch {
      badJson += 1;
    }
  }
  add({
    id: "schema",
    group: "social",
    label: "Structured data (JSON-LD)",
    weight: 5,
    ...(types.size
      ? { status: badJson ? "warn" : "pass", detail: `Found: ${[...types].slice(0, 6).join(", ")}${badJson ? ` (${badJson} block could not be read)` : ""}.`, fix: badJson ? "Fix the JSON-LD block that has invalid JSON." : undefined }
      : { status: "fail", detail: "No structured data found in the HTML.", fix: "Add JSON-LD that describes your business, person, products or articles, so Google understands the page." }),
  });

  // ---- robots.txt and sitemap
  const { check: robots, sitemaps } = robotsCheck(await robotsPromise);
  add(robots);
  const sitemapUrls = [...new Set([...sitemaps, `${origin}/sitemap.xml`])].slice(0, 2);
  let sitemapOk: string | null = null;
  for (const s of sitemapUrls) {
    try {
      const u = new URL(s, origin);
      const res = await safeFetch(u, { maxBytes: 1024 * 1024, timeoutMs: 6000, accept: "application/xml,text/xml,*/*;q=0.5" });
      if (res.status === 200 && /<(urlset|sitemapindex)[\s>]/i.test(res.body)) {
        sitemapOk = res.url;
        break;
      }
    } catch {
      // try the next one
    }
  }
  add({
    id: "sitemap",
    group: "crawl",
    label: "XML sitemap",
    weight: 4,
    ...(sitemapOk
      ? { status: "pass", detail: `Sitemap found: ${short(sitemapOk)}` }
      : { status: "warn", detail: "No XML sitemap found at /sitemap.xml or in robots.txt.", fix: "Generate a sitemap.xml with every page you want indexed and submit it in Google Search Console." }),
  });

  // ---- Speed
  const { data: pagespeed, note } = await speed;
  const perf = pagespeed?.performance;
  add({
    id: "performance",
    group: "speed",
    label: "Mobile performance (PageSpeed)",
    weight: 10,
    ...(perf == null
      ? { status: "skip", detail: note ?? "Not measured." }
      : perf >= 90
        ? { status: "pass", detail: `Mobile performance score ${perf}/100.` }
        : {
            status: perf >= 50 ? "warn" : "fail",
            detail: `Mobile performance score ${perf}/100.`,
            fix: "Make the first screen load faster: compress and resize images, send less JavaScript, avoid preloaders that hide content, and self-host fonts.",
          }),
  });

  return {
    url: start.toString(),
    finalUrl: finalUrl.toString(),
    checkedAt: new Date().toISOString(),
    score: scoreOf(checks),
    checks,
    pagespeed,
    pagespeedNote: pagespeed ? undefined : note,
  };
};
