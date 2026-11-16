// SEO Command Center (/admin/seo): shared rules. Every threshold here is our own rule for flagging a
// page or query, never an outside benchmark; numbers shown to the owner always come from Search
// Console, Bing, PageSpeed or our own crawl.
import { SITE } from "@/lib/site";

export const SITE_ORIGIN = SITE.url;

/** Search Console property (domain property by default). */
export const gscSite = () => process.env.GSC_SITE_URL?.trim() || "sc-domain:hamzatariq.site";

export const RULES = {
  /** <title> length (CLAUDE.md: titles under 60 characters). */
  titleMax: 60,
  /** Meta description length (CLAUDE.md: 150–160). */
  descMin: 150,
  descMax: 160,
  /** Thin page: fewer visible words than this (crawler view, no JavaScript). */
  thinWords: { "blog-post": 600, default: 250 } as Record<string, number>,
  /** HTML response slower than this (ms) is a "slow page" notice. */
  slowResponseMs: 1500,
  /** Lighthouse mobile performance under this is a "slow template" warning (CLAUDE.md: 95+, home 90+). */
  minPerformance: { home: 90, default: 95 } as Record<string, number>,
  /** Striking distance: average position in this range with at least this many impressions in 28 days. */
  striking: { from: 8, to: 20, minImpressions: 10 },
  /** Low CTR: a page with at least this many impressions whose CTR is under half of the site's own CTR at that position. */
  lowCtr: { minImpressions: 100, ratio: 0.5, minBucketImpressions: 300, fallbackCtr: 0.01 },
  /** Missing page: a query with at least this many impressions that no page targets. */
  missingMinImpressions: 5,
  /** Cannibalisation: 2+ pages each with this share of a query's impressions (and the query has at least minImpressions). */
  cannibal: { minImpressions: 10, minShare: 0.15 },
  /** Losing clicks: down at least this share vs the previous 28 days, from at least minClicks. */
  losing: { minClicks: 10, drop: 0.3 },
  /** Keyword ideas from our own queries need at least this many impressions in 28 days. */
  ideaMinImpressions: 3,
  /** New blog posts are not judged on indexing before this many days. */
  indexGraceDays: 14,
};

/** Brand queries are never "missing pages" or keyword ideas. */
export const BRAND = /\b(hamza|tariq|devrex|hamzatariq)\b/i;

/**
 * Never a new topic (CLAUDE.md): Shopify work (not offered), places (pages never target a city or
 * country) and "near me" searches. Such queries stay visible in Queries but get no backlog fix.
 */
export const OFF_LIMITS =
  /\b(shopify|near me|uk|usa|united states|united kingdom|england|london|manchester|birmingham|scotland|ireland|dublin|canada|toronto|vancouver|australia|sydney|melbourne|new zealand|auckland|dubai|uae|abu dhabi|saudi|riyadh|qatar|doha|germany|berlin|france|paris|india|delhi|mumbai|bangalore|pakistan|karachi|lahore|islamabad|bahawalpur|new york|nyc|california|texas|florida|chicago|los angeles)\b/i;

export type Template =
  | "home"
  | "blog-index"
  | "blog-category"
  | "blog-post"
  | "services-index"
  | "service"
  | "solutions-index"
  | "solution"
  | "work-index"
  | "work"
  | "tool"
  | "page";

export const templateOf = (path: string): Template => {
  if (path === "/") return "home";
  if (path === "/blog") return "blog-index";
  if (path.startsWith("/blog/category/")) return "blog-category";
  if (path.startsWith("/blog/")) return "blog-post";
  if (path === "/services") return "services-index";
  if (path.startsWith("/services/")) return "service";
  if (path === "/solutions") return "solutions-index";
  if (path.startsWith("/solutions/")) return "solution";
  if (path === "/work") return "work-index";
  if (path.startsWith("/work/")) return "work";
  if (path.startsWith("/tools/")) return "tool";
  return "page";
};

export const TEMPLATE_LABELS: Record<Template, string> = {
  home: "Home",
  "blog-index": "Blog index",
  "blog-category": "Blog category",
  "blog-post": "Blog post",
  "services-index": "Services",
  service: "Service page",
  "solutions-index": "Industries",
  solution: "Industry page",
  "work-index": "Work",
  work: "Project page",
  tool: "Free tool",
  page: "Other page",
};

/** Templates measured for Core Web Vitals once a day, with the page that represents each. */
export const CWV_TEMPLATES: { template: Template; pick: (paths: string[]) => string | undefined }[] = [
  { template: "home", pick: () => "/" },
  { template: "blog-post", pick: (p) => p.find((x) => x.startsWith("/blog/") && !x.startsWith("/blog/category/") && x !== "/blog") },
  { template: "service", pick: (p) => p.find((x) => x === "/services/nextjs-websites") ?? p.find((x) => x.startsWith("/services/")) },
  { template: "solution", pick: (p) => p.find((x) => x.startsWith("/solutions/")) },
  { template: "work", pick: (p) => p.find((x) => x === "/work/dulhahouse") ?? p.find((x) => x.startsWith("/work/")) },
  { template: "tool", pick: (p) => p.find((x) => x === "/tools/free-seo-audit") ?? p.find((x) => x.startsWith("/tools/")) },
];

/** Full URL (any origin, www or not) → path on our site, or null when it's another site. */
export const toPath = (url: string): string | null => {
  try {
    const u = new URL(url, SITE_ORIGIN);
    if (u.hostname.replace(/^www\./, "") !== new URL(SITE_ORIGIN).hostname) return null;
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return path;
  } catch {
    return null;
  }
};

/** Only blog posts are content files the autopilot may change on its own (content/blog/<slug>.mdx). */
export const isSafePage = (path: string | null | undefined) => !!path && templateOf(path) === "blog-post";
export const contentFileOf = (path: string) =>
  templateOf(path) === "blog-post" ? `content/blog/${path.slice("/blog/".length)}.mdx` : templateOf(path) === "solution" ? `content/solutions/${path.slice("/solutions/".length)}.mdx` : null;

export const todayPkt = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
