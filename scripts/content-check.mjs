// Quality gate for blog posts (rules in content/STYLE.md, strategy in content/seo/strategy.md).
// A post that fails is never published: this runs before every build (prebuild, offline) and in
// the autopilot (with external link checks).
//
//   npm run content:check                  all posts, external links checked
//   npm run content:check -- --offline     skip external link requests (used by prebuild)
//   npm run content:check -- --external=skip-if-blocked   scheduled runs in a restricted sandbox:
//                                          blocked links pass only on trusted domains ("not verified")
//   npm run content:check -- my-post-slug  only the given post(s)
//   npm run content:check -- --json        machine-readable output
//
// What it enforces, by STYLE.md section: shape and length (pillar vs supporting), real facts only
// (every number from content/owner/ and src/data/), keyword strategy (cluster, intent, funnel,
// secondary keywords, density), SERP brief (content/seo/briefs/<slug>.md), information gain (2+
// kinds), on-page (title, meta, first 100 words, snippet block, question H2s, intent match),
// internal linking (pillar, siblings, service page, descriptive anchors, links from older posts),
// E-E-A-T (trust line, sourced claims), banned filler, generic intros and headings, repetition,
// images (alt text, size), schema inputs (FAQ, HowTo), pace, and the backlog.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const POSTS_DIR = join(ROOT, "content", "blog");
const BRIEFS_DIR = join(ROOT, "content", "seo", "briefs");
const SITE_URL = "https://hamzatariq.site";
const TITLE_SUFFIX = " | Hamza Tariq";
// Pace (CLAUDE.md): up to 3 posts per publish day, publish days 2+ days apart, max 12 per ISO week.
// Same-day posts are in different clusters. Keep in sync with scripts/autopilot/lib.mjs.
const MAX_POSTS_PER_DAY = 3;
const MIN_DAYS_BETWEEN_POSTS = 2; // between publish days
const MAX_POSTS_PER_WEEK = 12;
// Distinct questions: a post's title or question H2s may not be this similar (content-word Jaccard)
// to a post published in the 14 days before it (or earlier the same day).
const SIMILAR_WINDOW_DAYS = 14;
const MAX_TITLE_SIMILARITY = 0.5;
const MAX_H2_SIMILARITY = 0.6;
// Posts published from this date follow the full expert standard (brief, information gain, trust
// line, links from older posts). Older posts get them at their next monthly refresh.
const SEO_V2_FROM = "2026-11-06";
// Original data from the audit tool needs this many audited sites (scripts/autopilot/lib.mjs).
const MIN_AUDIT_SITES = 30;
const LENGTH = { supporting: [1300, 2000], pillar: [2500, 3500] };
const H2_RANGE = { supporting: [5, 8], pillar: [8, 14] };
const MAX_KEYWORD_DENSITY = 2.5; // % of prose words taken by the main keyword
const MAX_SECONDARY_DENSITY = 1.5;
const MAX_IMAGE_KB = 250;
const INTENTS = ["hire", "buy", "compare", "learn", "fix"];
const FUNNEL = ["awareness", "consideration", "decision"];
// Head terms a new site can't win; topics must be long-tail.
const HEAD_TERMS = ["web developer", "web design", "website", "seo", "chatbot", "ai chatbot", "react", "next.js", "ecommerce", "dashboard", "web app", "react developer", "next.js developer", "seo services", "website cost"];

const args = process.argv.slice(2);
const offline = args.includes("--offline");
// --external=full (default): every outside link must answer. --external=skip-if-blocked (scheduled runs
// in a restricted sandbox): when the network blocks a link (no connection, or 403/407/429), it passes as
// "not verified" if it's on TRUSTED_DOMAINS and fails otherwise; real errors (404, 410, 5xx) still fail.
const externalMode = (args.find((a) => a.startsWith("--external="))?.split("=")[1] ?? "full").trim();
if (!["full", "skip-if-blocked"].includes(externalMode)) {
  console.error(`Unknown --external mode "${externalMode}" (full | skip-if-blocked)`);
  process.exit(1);
}
const BLOCKED_STATUS = new Set([403, 407, 429]);
const TRUSTED_DOMAINS = ["developers.google.com", "web.dev", "nextjs.org", "react.dev", "supabase.com", "vercel.com", "ai.google.dev", "developer.mozilla.org"];
const asJson = args.includes("--json");
const only = args.filter((a) => !a.startsWith("--")).map((a) => a.replace(/\.mdx$/, "").split(/[\\/]/).pop());

const read = (path) => (existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n") : "");
const walk = (dir) =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : [];

// ---------- Facts: every number in a post must appear in these sources ----------
const FACT_SOURCES = [
  ...walk(join(ROOT, "content", "owner")).filter((f) => f.endsWith(".md")),
  join(ROOT, "src/data/caseStudies.ts"),
  join(ROOT, "src/data/services.ts"),
  join(ROOT, "src/data/experience.ts"),
  join(ROOT, "content/blog-categories.json"),
];
const numberValues = (text) =>
  (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => {
    const plain = n.replace(/,(?=\d{3}\b)/g, "");
    return String(Number(plain));
  });
const projectCount = (read("src/data/projects.ts").match(/"slug":/g) ?? []).length;
const ALLOWED_NUMBERS = new Set([...FACT_SOURCES.flatMap((f) => numberValues(readFileSync(f, "utf8"))), String(projectCount)]);

// ---------- Site routes, for internal link checks ----------
const servicesTs = read("src/data/services.ts");
const SERVICE_SLUGS = [...servicesTs.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const SERVICE_KEYWORDS = [...servicesTs.matchAll(/keyword: "([^"]+)"/g)].map((m) => m[1]);
const PROJECT_SLUGS = [...read("src/data/projects.ts").matchAll(/"slug":"([^"]+)"/g)].map((m) => m[1]);
const CASE_SLUGS = [...read("src/data/caseStudies.ts").matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const TOOL_KEYWORDS = [...read("src/data/tools.ts").matchAll(/keyword: "([^"]+)"/g)].map((m) => m[1]);
const CATEGORIES = JSON.parse(read("content/blog-categories.json") || "[]");
const CLUSTERS = JSON.parse(read("content/seo/clusters.json") || "[]");
const TESTIMONIALS = JSON.parse(read("content/testimonials.json") || '{"items":[]}').items ?? [];
const POST_FILES = existsSync(POSTS_DIR) ? readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx")) : [];
const POST_SLUGS = POST_FILES.map((f) => f.replace(/\.mdx$/, ""));
const TOOL_HREFS = [...read("src/data/tools.ts").matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
const SOLUTIONS_DIR = join(ROOT, "content", "solutions");
const SOLUTION_FILES = existsSync(SOLUTIONS_DIR) ? readdirSync(SOLUTIONS_DIR).filter((f) => f.endsWith(".mdx")) : [];
const SOLUTIONS = SOLUTION_FILES.map((file) => {
  const { data, content } = matter(readFileSync(join(SOLUTIONS_DIR, file), "utf8"));
  return { file, slug: file.replace(/\.mdx$/, ""), data, body: content };
});
const SOLUTION_KEYWORDS = SOLUTIONS.map((x) => String(x.data.keyword ?? ""));
const STATIC_ROUTES = ["/", "/services", "/work", "/about", "/hire", "/contact", "/blog", "/blog/rss.xml", "/solutions", ...TOOL_HREFS];
if (TESTIMONIALS.length) STATIC_ROUTES.push("/reviews");
const KNOWN_ROUTES = new Set([
  ...STATIC_ROUTES,
  ...SERVICE_SLUGS.map((s) => `/services/${s}`),
  ...[...PROJECT_SLUGS, ...CASE_SLUGS].map((s) => `/work/${s}`),
  ...POST_SLUGS.map((s) => `/blog/${s}`),
  ...CATEGORIES.map((c) => `/blog/category/${c.slug}`),
  ...SOLUTIONS.map((x) => `/solutions/${x.slug}`),
]);

// ---------- Text helpers ----------
// Banned filler (STYLE.md). Single words match as whole words in any form ("unlocks", "elevated").
const BANNED = [
  "in today's digital world", "in today's digital age", "in today's fast-paced", "in today's world", "in the ever-evolving", "ever-changing",
  "it's no secret", "it is no secret", "look no further", "game-changer", "game changer", "dive deep", "deep dive", "dive into",
  "it's important to note", "it is important to note", "it's worth noting", "in conclusion", "to sum up", "navigating the", "tapestry",
  "cutting-edge", "harness the power", "at the end of the day", "without further ado", "a testament to", "when it comes to",
  "take it to the next level", "next level", "plays a crucial role", "plays a vital role", "in the realm of", "one-stop shop",
  "best-in-class", "world-class", "state-of-the-art", "needless to say", "rest assured",
];
const BANNED_WORDS = ["unlock", "unleash", "delve", "elevate", "seamless", "seamlessly", "robust", "landscape", "embark", "revolutionize", "supercharge", "leverage", "empower", "synergy", "paradigm", "holistic", "utilize", "myriad", "plethora", "bespoke"];
const bannedWordRe = new RegExp(`\\b(${BANNED_WORDS.join("|")})(s|d|ed|es|ing|ly)?\\b`, "gi");
// Claims that need a linked source in the same sentence.
const SOURCE_CLAIMS = /\b(studies (show|suggest|found)|research (shows|suggests|found)|statistics show|experts (say|agree)|according to (experts|research|studies)|surveys? (show|found)|data shows)\b/i;
const GENERIC_INTRO = /^(in this (article|post|guide|blog)|are you (looking|wondering|tired)|have you ever|if you('| a)re (a|an|looking)|whether you('| a)re|welcome to|let's (dive|talk|explore)|when it comes to|imagine (this|a|you)|picture this|in an era)/i;
const GENERIC_H2 = /^(introduction|intro|conclusion|final thoughts|wrapping up|in summary|summary|overview|closing thoughts|the bottom line|key takeaways|why (it|this) matters)\b/i;
const CLICKBAIT = /(!|\byou won'?t believe\b|\bshocking\b|\bsecret(s)?\b|\bultimate\b|\binsane\b|\bmind[- ]blowing\b|\bthis one trick\b|\bnobody tells you\b|\bhack(s)?\b)/i;
const BENEFIT = /\b(\d+|cost|costs|price|prices|pricing|fix|fixes|checklist|steps?|how to|how much|what to|which|vs|without|faster|guide|explained|compared|questions|red flags|mistakes|template|works?|real|worth)\b/i;
const GENERIC_ANCHORS = new Set(["here", "click here", "this", "this post", "this page", "this article", "this guide", "read more", "learn more", "link", "more", "website", "this link", "see here", "check this out"]);
const QUESTION_H2 = /(\?\s*$|^(how|what|why|when|which|should|can|do|does|is|are|will|who|where)\b)/i;

const STOP = new Set(["a", "an", "the", "is", "are", "your", "my", "of", "to", "in", "on", "it", "its", "this", "that", "i", "we", "you", "our", "for", "and", "with", "how", "do", "does"]);
const normalize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/node\.?js/g, "nodejs")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const tokens = (text) => normalize(text).split(" ").filter(Boolean);
const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const same = (a, b) => stem(a) === stem(b);

/** End index of a keyword match starting at `start` (up to 2 stop words between keyword words), or -1. */
const matchAt = (t, start, k) => {
  if (!same(t[start], k[0])) return -1;
  let i = start + 1;
  for (let j = 1; j < k.length; j++) {
    let skipped = 0;
    while (i < t.length && !same(t[i], k[j]) && STOP.has(t[i]) && skipped < 2) {
      i++;
      skipped++;
    }
    if (i < t.length && same(t[i], k[j])) i++;
    else return -1;
  }
  return i;
};
const keywordPositions = (text, keyword) => {
  const t = tokens(text);
  const k = tokens(keyword);
  const found = [];
  for (let start = 0; k.length && start < t.length; start++) {
    const end = matchAt(t, start, k);
    if (end > 0) {
      found.push(start);
      start = end - 1;
    }
  }
  return found;
};
const containsKeyword = (text, keyword) => keywordPositions(text, keyword).length > 0;
const slugHasKeyword = (slug, keyword) => {
  const s = slug.split("-");
  let i = 0;
  for (const k of tokens(keyword).filter((w) => !STOP.has(w))) {
    while (i < s.length && !same(s[i], k)) i++;
    if (i >= s.length) return false;
    i++;
  }
  return true;
};

/** Prose only: no code, no component tags, no URLs. Used for word count, numbers and phrases. */
const proseOf = (body) =>
  body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<Figure[\s\S]*?\/>/g, " ")
    .replace(/<Review[\s\S]*?\/>/g, " ")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, " ")
    .replace(/https?:\/\/\S+/g, " ");
const words = (text) => text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
const wordCount = (text) => words(text).length;
const firstWords = (text, n) => words(text).slice(0, n).join(" ");

const blocksOf = (body) => body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
const firstParagraph = (body) =>
  blocksOf(body).find((b) => !b.startsWith("#") && !b.startsWith("<") && !b.startsWith("import ") && !b.startsWith("|") && !b.startsWith("```")) ?? "";
const sentencesOf = (text) => text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9*"(])/).map((s) => s.trim()).filter(Boolean);
const shingles = (text, n = 5) => {
  const t = tokens(text);
  const set = new Set();
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n).join(" "));
  return set;
};
const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const x of a) if (b.has(x)) common++;
  return common / (a.size + b.size - common);
};
/** Sections of a markdown file keyed by "## Heading" (lowercased). */
const sectionsOf = (md) => {
  const out = {};
  let current = "";
  for (const line of md.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      current = m[1].toLowerCase();
      out[current] = "";
    } else if (current) out[current] += `${line}\n`;
  }
  return out;
};
const section = (sections, prefix) => Object.entries(sections).find(([k]) => k.startsWith(prefix))?.[1] ?? null;
const bullets = (text) => (text ?? "").split("\n").filter((l) => /^\s*([-*]|\d+\.)\s+\S/.test(l));
const field = (md, name) => md.match(new RegExp(`^[-*]\\s*${name}:\\s*(.+)$`, "im"))?.[1].trim() ?? null;
/** A YYYY-MM-DD field; anything after the date is a note. */
const dateField = (md, name) => field(md, name)?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

const isoWeek = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  return `${year}-W${String(Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)).padStart(2, "0")}`;
};

const checkExternal = async (url) => {
  const attempt = async (method) => {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; hamzatariq.site content check)" },
    });
    return res.status;
  };
  try {
    let status = await attempt("HEAD");
    if (status >= 400) status = await attempt("GET");
    if (BLOCKED_STATUS.has(status)) return { ok: true, blocked: true, warn: `${url} answered ${status} (blocks bots?)` };
    return status < 400 ? { ok: true } : { ok: false, error: `${url} returned ${status}` };
  } catch (error) {
    return { ok: false, blocked: true, error: `${url} could not be reached (${error.cause?.code ?? error.name})` };
  }
};

/** --external=skip-if-blocked: a link the network blocks passes only on a trusted domain, marked "not verified". */
const onTrustedDomain = (url) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};
const judgeExternal = (url, r) => {
  if (externalMode !== "skip-if-blocked" || !r.blocked) return r;
  return onTrustedDomain(url)
    ? { ok: true, warn: `${url} not verified (network blocked; trusted domain)` }
    : { ok: false, error: `${url} could not be checked (network blocked) and is not on the trusted-domain list` };
};

// ---------- Posts ----------
const dateStr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));
const linksOf = (body) =>
  [...body.matchAll(/(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => ({ text: m[1].replace(/[*_`]/g, "").trim(), href: m[2] }));
const internalPath = (href) => {
  const l = href.startsWith(SITE_URL) ? href.slice(SITE_URL.length) || "/" : href;
  return l.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
};
const parsed = POST_FILES.map((file) => {
  const { data, content } = matter(readFileSync(join(POSTS_DIR, file), "utf8").replace(/\r\n/g, "\n"));
  const slug = file.replace(/\.mdx$/, "");
  const links = linksOf(content);
  const internal = [...new Set(links.filter((l) => l.href.startsWith("/") || l.href.startsWith(SITE_URL)).map((l) => internalPath(l.href)))];
  return { file, slug, data, body: content, published: dateStr(data.published), links, internal };
});
const posts = only.length ? parsed.filter((p) => only.includes(p.slug)) : parsed;
if (only.length && posts.length !== only.length) {
  console.error(`Unknown post(s): ${only.filter((s) => !parsed.some((p) => p.slug === s)).join(", ")}`);
  process.exit(1);
}

const byDate = [...parsed].sort((a, b) => a.published.localeCompare(b.published) || a.slug.localeCompare(b.slug));
const weekCounts = {};
for (const p of byDate) {
  const week = isoWeek(p.published);
  weekCounts[week] = [...(weekCounts[week] ?? []), p.slug];
}
/** The latest post on an earlier publish day, for the 2-day gap between publish days. */
const previousDayPost = (post) => [...byDate].reverse().find((p) => p.published < post.published) ?? null;
/** Posts before this one (by date, then slug) within the similarity window. */
const recentPosts = (post) => {
  const from = new Date(Date.parse(`${post.published}T00:00:00Z`) - SIMILAR_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  return byDate.slice(0, byDate.findIndex((p) => p.slug === post.slug)).filter((p) => p.published >= from);
};
const SIM_STOP = new Set([...STOP, "what", "why", "when", "which", "should", "can", "will", "who", "where", "be", "or", "vs", "much", "need", "get"]);
const contentWords = (text) => new Set(tokens(text).filter((w) => !SIM_STOP.has(w)).map(stem));
const questionH2sOf = (body) => [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim()).filter((h) => QUESTION_H2.test(h));
const olderPosts = (post) => byDate.slice(0, byDate.findIndex((p) => p.slug === post.slug));

const backlog = JSON.parse(read("content/backlog.json") || '{"items":[]}');
/** A cluster's posts use its own category, or the category whose CTA is the cluster's service page. */
const categoryFits = (category, cluster) => category === cluster.category || CATEGORIES.some((c) => c.slug === category && c.cta?.href === cluster.servicePage);
/** Primary keywords of every page and topic: a secondary keyword must not be another page's main keyword. */
const PRIMARY_KEYWORDS = [...SERVICE_KEYWORDS, ...TOOL_KEYWORDS, ...SOLUTION_KEYWORDS, ...(backlog.items ?? []).map((i) => i.keyword), ...parsed.map((p) => p.data.keyword)].map(normalize);
const backlogItem = (post) => (backlog.items ?? []).find((i) => i.publishedSlug === post.slug) ?? null;

/** Information gain kinds found in a post (STYLE.md: at least 2, real data only). */
const informationGain = (post, brief) => {
  const kinds = [];
  const boxes = [...post.body.matchAll(/<FromMyWork[\s\S]*?<\/FromMyWork>/g)].map((m) => m[0]);
  if (boxes.some((b) => /<Figure[\s>]|!\[/.test(b))) kinds.push("example with screenshot");
  if ([...post.body.matchAll(/<Review\s+id="([^"]+)"/g)].some((m) => TESTIMONIALS.some((t) => t.id === m[1]))) kinds.push("client review");
  if (brief?.data?.ok && new RegExp(`\\b${brief.data.sites}\\s+(sites|websites)\\b`).test(proseOf(post.body))) kinds.push("original audit data");
  const hasOrderedSteps = /(^\s*1\.\s.+\n(?:.*\n)*?^\s*4\.\s)/m.test(post.body);
  if (/```/.test(post.body) || /^\s*- \[ \]/m.test(post.body) || /^\|.*\|\s*\n\|\s*:?-{3,}/m.test(post.body) || hasOrderedSteps) kinds.push("practical asset");
  if (/<MyTake[\s>]/.test(post.body)) kinds.push("labelled opinion");
  return kinds;
};

/** content/seo/briefs/<slug>.md: SERP research done before writing. */
const readBrief = (post) => {
  const path = join(BRIEFS_DIR, `${post.slug}.md`);
  if (!existsSync(path)) return null;
  const md = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const sections = sectionsOf(md);
  const dataSection = section(sections, "original data");
  let data = null;
  if (dataSection !== null) {
    const sites = Number(field(dataSection, "Sites"));
    const query = field(dataSection, "Query");
    const queried = dateField(dataSection, "Queried");
    data = { sites, query, queried, numbers: numberValues(dataSection), ok: sites >= MIN_AUDIT_SITES && !!query && /^\d{4}-\d{2}-\d{2}$/.test(queried ?? "") };
  }
  return { md, sections, data };
};
const briefErrors = (post, brief, keyword) => {
  const errors = [];
  const { md, sections } = brief;
  if (normalize(field(md, "Keyword")) !== normalize(keyword)) errors.push(`brief: "- Keyword:" must be "${keyword}"`);
  const researched = dateField(md, "Researched");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(researched ?? "")) errors.push('brief: "- Researched: YYYY-MM-DD" missing');
  else if (researched > post.published) errors.push("brief: researched after the post's published date");
  const need = [
    ["search intent", 1],
    ["top results", 3],
    ["what they miss", 2],
    ["questions to answer", 4],
    ["our angle", 1],
    ["unique additions", 2],
  ];
  for (const [name, min] of need) {
    const text = section(sections, name);
    if (text === null) errors.push(`brief: missing "## ${name[0].toUpperCase()}${name.slice(1)}" section`);
    else if (name !== "search intent" && name !== "our angle" && bullets(text).length < min) errors.push(`brief: "${name}" needs ${min}+ bullet points`);
    else if (!text.trim()) errors.push(`brief: "${name}" is empty`);
  }
  const top = section(sections, "top results") ?? "";
  if ((top.match(/https?:\/\//g) ?? []).length < 3) errors.push("brief: top results need 3+ URLs");
  if (brief.data && !brief.data.ok)
    errors.push(`brief: "Original data" needs "- Query:", "- Queried: YYYY-MM-DD" and "- Sites:" with ${MIN_AUDIT_SITES}+ sites (else remove the section)`);
  return errors;
};

const results = [];
for (const post of posts) {
  const errors = [];
  const warnings = [];
  const { data, body, slug, published } = post;
  const prose = proseOf(body);
  const faq = Array.isArray(data.faq) ? data.faq : [];
  const keyword = String(data.keyword ?? "").trim();
  const seoTitle = String(data.seoTitle ?? data.title ?? "");
  const description = String(data.description ?? "");
  const trust = String(data.trust ?? "").trim();
  const secondary = Array.isArray(data.secondary) ? data.secondary.map(String) : [];
  const v2 = published >= SEO_V2_FROM;
  const cluster = CLUSTERS.find((c) => c.id === data.cluster) ?? null;
  const item = backlogItem(post);
  const isPillar = !!cluster && cluster.pillar.slug === slug;
  const role = isPillar ? "pillar" : "supporting";
  const pendingExpansion = isPillar && item?.expand === true;
  const brief = readBrief(post);

  // Keyword strategy: cluster, role, intent, funnel, secondary keywords (STYLE.md "Keyword strategy")
  if (!cluster) errors.push(`unknown or missing cluster "${data.cluster ?? ""}" (content/seo/clusters.json)`);
  else {
    if (!categoryFits(data.category, cluster)) errors.push(`category "${data.category}" doesn't fit cluster "${cluster.id}" (${cluster.category}, or the category linking to ${cluster.servicePage})`);
    if (item && item.cluster !== cluster.id) errors.push(`backlog item is in cluster "${item.cluster}", post says "${cluster.id}"`);
  }
  if ((data.role ?? "supporting") !== role) errors.push(`role must be "${role}" (${isPillar ? "this slug is the cluster's pillar" : "only the cluster's pillar slug is a pillar"})`);
  if (!INTENTS.includes(data.intent)) errors.push(`intent must be one of ${INTENTS.join(", ")}`);
  if (!FUNNEL.includes(data.funnel)) errors.push(`funnel must be one of ${FUNNEL.join(", ")}`);
  if (secondary.length < 3 || secondary.length > 6) errors.push(`${secondary.length} secondary keywords (need 3–6)`);
  for (const sk of secondary) if (normalize(sk) !== normalize(keyword) && PRIMARY_KEYWORDS.includes(normalize(sk))) errors.push(`secondary keyword "${sk}" is another page's main keyword (cannibalization)`);

  // Length and structure
  const count = wordCount(prose);
  const [minWords, maxWords] = LENGTH[role];
  if (pendingExpansion) warnings.push(`pillar waiting for expansion (backlog "expand": true): ${count} words, needs ${minWords}–${maxWords}`);
  else {
    if (count < minWords) errors.push(`only ${count} words (${role} min ${minWords})`);
    if (count > maxWords) errors.push(`${count} words (${role} max ${maxWords})`);
  }
  const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  const [minH2, maxH2] = pendingExpansion ? H2_RANGE.supporting : H2_RANGE[role];
  if (h2s.length < minH2 || h2s.length > maxH2) errors.push(`${h2s.length} H2 headings (${role} needs ${minH2}–${maxH2})`);
  const questionH2s = h2s.filter((h) => QUESTION_H2.test(h)).length;
  if (questionH2s < (role === "pillar" ? 3 : 2)) errors.push(`${questionH2s} question-style H2s (need ${role === "pillar" ? 3 : 2}+; use the brief's questions)`);
  const generic = h2s.filter((h) => GENERIC_H2.test(h));
  if (generic.length) errors.push(`generic headings: ${generic.map((h) => `"${h}"`).join(", ")}`);
  if (!data.title) errors.push("missing title");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) errors.push("published must be YYYY-MM-DD");

  // Title and meta (STYLE.md "On-page")
  if (seoTitle.length + TITLE_SUFFIX.length > 60) errors.push(`<title> is ${seoTitle.length + TITLE_SUFFIX.length} chars with the suffix (max 60)`);
  if (CLICKBAIT.test(seoTitle) || CLICKBAIT.test(String(data.title ?? ""))) errors.push("clickbait in the title");
  if (!BENEFIT.test(seoTitle)) errors.push("title needs a specific benefit or number (cost, fix, checklist, steps, vs, a number…)");
  if (description.length < 150 || description.length > 160) errors.push(`meta description is ${description.length} chars (150–160)`);

  // Keyword placement, density and uniqueness
  if (!keyword) errors.push("missing keyword");
  else {
    const titlePos = keywordPositions(seoTitle, keyword)[0];
    if (titlePos === undefined) errors.push(`keyword "${keyword}" missing from the title`);
    else if (titlePos > 3) errors.push(`keyword starts at word ${titlePos + 1} of the title (move it near the start)`);
    if (!containsKeyword(description, keyword)) errors.push(`keyword "${keyword}" missing from the meta description`);
    if (!slugHasKeyword(slug, keyword)) errors.push(`keyword "${keyword}" missing from the slug`);
    if (!containsKeyword(firstParagraph(body), keyword)) errors.push(`keyword "${keyword}" missing from the first paragraph`);
    if (!containsKeyword(firstWords(prose, 100), keyword)) errors.push(`keyword "${keyword}" missing from the first 100 words`);
    if (!h2s.some((h) => containsKeyword(h, keyword))) errors.push(`keyword "${keyword}" missing from every H2`);
    const density = (keywordPositions(prose, keyword).length * tokens(keyword).length * 100) / Math.max(count, 1);
    if (density > MAX_KEYWORD_DENSITY) errors.push(`keyword density ${density.toFixed(1)}% (max ${MAX_KEYWORD_DENSITY}%): reads as stuffing`);
    const k = normalize(keyword);
    const dupPost = parsed.find((p) => p.slug !== slug && normalize(p.data.keyword) === k);
    if (dupPost) errors.push(`keyword already used by post "${dupPost.slug}"`);
    if (SERVICE_KEYWORDS.some((s) => normalize(s) === k)) errors.push("keyword already targeted by a service page");
    if (TOOL_KEYWORDS.some((s) => normalize(s) === k)) errors.push("keyword already targeted by a tool page");
    if (SOLUTION_KEYWORDS.some((s) => normalize(s) === k)) errors.push("keyword already targeted by an industry page");
  }
  const searchable = `${prose}\n${h2s.join("\n")}\n${faq.map((f) => `${f.q} ${f.a}`).join("\n")}`;
  const usedSecondary = secondary.filter((s) => containsKeyword(searchable, s));
  if (secondary.length && usedSecondary.length < Math.min(3, secondary.length))
    (pendingExpansion ? warnings : errors).push(`only ${usedSecondary.length} secondary keywords used (need ${Math.min(3, secondary.length)}); unused: ${secondary.filter((s) => !usedSecondary.includes(s)).join(", ")}`);
  for (const s of secondary) {
    const d = (keywordPositions(prose, s).length * tokens(s).length * 100) / Math.max(count, 1);
    if (d > MAX_SECONDARY_DENSITY) errors.push(`secondary keyword "${s}" density ${d.toFixed(1)}% (max ${MAX_SECONDARY_DENSITY}%)`);
  }

  // Answer first, snippet block, search intent match
  const lead = firstWords(prose, 100);
  const firstBlock = firstParagraph(body);
  if (GENERIC_INTRO.test(proseOf(firstBlock).trim())) errors.push("generic intro: answer the question in the first sentence");
  const beforeSecondH2 = body.split(/^##\s+/m).slice(0, 2).join("\n");
  const hasSnippet = /^\s*([-*]|\d+\.)\s+\S/m.test(beforeSecondH2) || /^\|.*\|\s*$/m.test(beforeSecondH2) || /\*\*[^*]+\*\*\s+(is|are|means)\b/.test(beforeSecondH2);
  if (!hasSnippet) errors.push("no snippet block near the top: add a short list, table or bold definition before the second H2");
  const lowerH2 = h2s.map((h) => h.toLowerCase());
  switch (data.intent) {
    case "hire":
      if (!lowerH2.slice(0, 3).some((h) => /(look for|check|skills|ask|what to|choose|hire|vet)/.test(h))) errors.push('hire intent: one of the first 3 H2s must cover what to look for');
      if (!lowerH2.some((h) => /(cost|price|rate|pay|budget)/.test(h))) errors.push("hire intent: needs an H2 on cost");
      if (!lowerH2.some((h) => /(red flag|warning sign|avoid|mistake)/.test(h))) errors.push("hire intent: needs an H2 on red flags");
      break;
    case "buy":
      if (!/\$\s?\d/.test(lead)) errors.push("buy intent: give a real price in the first 100 words");
      break;
    case "compare":
      if (!/^\|.*\|\s*$/m.test(body.split(/^##\s+/m).slice(0, 3).join("\n"))) errors.push("compare intent: put a comparison table before the third H2");
      if (!/\b(choose|pick|better|go with|use .+ if|winner|wins)\b/i.test(lead)) errors.push("compare intent: give the verdict in the first 100 words");
      break;
    case "fix":
      if (!/\b(fix|fixes|fixed|check|run|add|change|move|test|open|replace|remove)\b/i.test(lead)) errors.push("fix intent: lead with the fix in the first 100 words");
      break;
    default:
  }

  // Category and CTA
  const category = CATEGORIES.find((c) => c.slug === data.category);
  if (!category) errors.push(`unknown category "${data.category}"`);
  else if (!category.cta?.href) errors.push("category has no CTA");

  // Links: counts, broken, descriptive anchors (STYLE.md "Internal linking")
  const external = [...new Set(post.links.filter((l) => /^https?:\/\//.test(l.href) && !l.href.startsWith(SITE_URL)).map((l) => l.href))];
  const internal = post.internal;
  if (internal.length < 3) errors.push(`${internal.length} internal links (min 3)`);
  if (!internal.some((l) => /^\/(services\/|hire|tools\/)/.test(l))) errors.push("no link to a service page, /hire or a tool");
  if (external.length < 1) errors.push("no link to a trusted outside source");
  if (external.length > 3) warnings.push(`${external.length} outside links (aim for 1–2)`);
  for (const l of internal) if (!KNOWN_ROUTES.has(l)) errors.push(`broken internal link: ${l}`);
  for (const l of post.links) if (GENERIC_ANCHORS.has(normalize(l.text))) errors.push(`non-descriptive anchor text "${l.text}" (${l.href})`);
  if (!offline) {
    for (const url of external) {
      const r = judgeExternal(url, await checkExternal(url));
      if (!r.ok) errors.push(`broken link: ${r.error}`);
      if (r.warn) warnings.push(r.warn);
    }
  }
  if (cluster) {
    if (!internal.includes(cluster.servicePage)) errors.push(`no link to the cluster's service page ${cluster.servicePage}`);
    if (!isPillar) {
      const pillarPath = `/blog/${cluster.pillar.slug}`;
      if (POST_SLUGS.includes(cluster.pillar.slug) && !internal.includes(pillarPath)) errors.push(`no link up to the pillar ${pillarPath}`);
      const siblings = olderPosts(post).filter((p) => p.data.cluster === cluster.id && p.slug !== cluster.pillar.slug);
      const linked = siblings.filter((p) => internal.includes(`/blog/${p.slug}`)).length;
      const need = Math.min(2, siblings.length);
      if (linked < need) errors.push(`links to ${linked} sibling posts in the cluster (need ${need} of: ${siblings.map((p) => p.slug).join(", ")})`);
    }
  }
  if (v2) {
    const older = olderPosts(post);
    const incoming = older.filter((p) => p.internal.includes(`/blog/${slug}`));
    const need = Math.min(2, older.length);
    if (incoming.length < need) errors.push(`${incoming.length} older posts link to this one (need ${need}; add links from related older posts)`);
  }

  // Required blocks
  if (faq.length < 4 || faq.length > 5) errors.push(`${faq.length} FAQ questions (need 4–5)`);
  if (faq.some((f) => !f?.q || !f?.a)) errors.push("an FAQ item is missing its question or answer");
  if (!/<FromMyWork[\s>]/.test(body)) errors.push('no "From my work" box (<FromMyWork>)');
  for (const m of body.matchAll(/<Review\s+id="([^"]+)"/g)) if (!TESTIMONIALS.some((t) => t.id === m[1])) errors.push(`<Review id="${m[1]}"> is not in content/testimonials.json`);
  if (data.howto) {
    const steps = Array.isArray(data.howto.steps) ? data.howto.steps : [];
    if (!data.howto.name || steps.length < 3 || steps.some((st) => !st?.name || !st?.text)) errors.push("howto needs a name and 3+ steps with name and text");
  } else if (/^##\s+.*\bstep[- ]by[- ]step\b/im.test(body)) warnings.push("step-by-step section without howto frontmatter (add HowTo schema if it's a real procedure)");

  // Images: descriptive alt text, local files exist and are compressed
  const alts = [
    ...[...body.matchAll(/!\[([^\]]*)\]\(/g)].map((m) => m[1]),
    ...[...body.matchAll(/<Figure([\s\S]*?)\/>/g)].map((m) => m[1].match(/alt="([^"]*)"/)?.[1] ?? ""),
    ...(data.cover ? [String(data.cover.alt ?? "")] : []),
  ];
  for (const alt of alts) {
    if (!alt.trim()) errors.push("an image has no alt text");
    else if (wordCount(alt) < 4 || /^(image|screenshot|photo|picture|figure)\b/i.test(alt)) errors.push(`alt text "${alt}" isn't descriptive (4+ words saying what it shows)`);
  }
  const srcs = [...body.matchAll(/(?:src="|!\[[^\]]*\]\()(\/[^")\s]+)/g)].map((m) => m[1]);
  if (data.cover?.src) srcs.push(String(data.cover.src));
  for (const src of new Set(srcs)) {
    const file = join(ROOT, "public", src);
    if (!existsSync(file)) errors.push(`image not found: public${src}`);
    else {
      const kb = statSync(file).size / 1024;
      if (kb > MAX_IMAGE_KB) errors.push(`image ${src} is ${Math.round(kb)} KB (max ${MAX_IMAGE_KB} KB; compress it)`);
      if (!/\.(webp|avif|svg)$/i.test(src)) warnings.push(`image ${src}: use WebP or AVIF`);
    }
  }

  // SERP brief, information gain and the trust line (posts from SEO_V2_FROM)
  if (v2) {
    if (!brief) errors.push(`no SERP brief: write content/seo/briefs/${slug}.md before the post`);
    else errors.push(...briefErrors(post, brief, keyword));
    const gain = informationGain(post, brief);
    if (gain.length < 2) errors.push(`information gain: ${gain.length ? gain.join(", ") : "none"} (need 2+ kinds: screenshot example, client review, audit data, practical asset, labelled opinion)`);
    if (!trust) errors.push('missing "trust" line (Why trust this guide, real credentials only)');
    if (brief) {
      const questions = bullets(section(brief.sections, "questions to answer")).map((q) => q.replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const covered = (q) => {
        const key = tokens(q).filter((w) => !STOP.has(w) && w.length > 3);
        return [...h2s, ...faq.map((f) => f.q)].some((h) => {
          const ht = new Set(tokens(h).map(stem));
          return key.length && key.filter((w) => ht.has(stem(w))).length / key.length >= 0.5;
        });
      };
      const missing = questions.filter((q) => !covered(q));
      if (questions.length && missing.length > questions.length / 2) errors.push(`most brief questions have no H2 or FAQ answer: ${missing.join(" | ")}`);
      else if (missing.length) warnings.push(`brief questions without their own H2 or FAQ item: ${missing.join(" | ")}`);
    }
  } else if (!brief) warnings.push(`no SERP brief yet (write content/seo/briefs/${slug}.md at the next refresh)`);

  // Facts: numbers must come from content/owner/, the data files or the brief's live audit query
  const howtoText = data.howto ? [data.howto.name, ...(data.howto.steps ?? []).flatMap((st) => [st.name, st.text])].join(" ") : "";
  const checkedText = [prose, String(data.title ?? ""), seoTitle, description, trust, howtoText, ...faq.flatMap((f) => [f.q, f.a])].join(" \n ");
  const allowed = new Set([...ALLOWED_NUMBERS, ...(brief?.data?.ok ? brief.data.numbers : [])]);
  const unknown = [...new Set(numberValues(checkedText).filter((n) => !allowed.has(n)))];
  if (unknown.length) errors.push(`numbers not found in content/owner/, the data files or the brief's audit query: ${unknown.join(", ")}`);

  // Sourced claims, filler, repetition
  const textBlocks = blocksOf(body.replace(/```[\s\S]*?```/g, " ")).filter((b) => !b.startsWith("#"));
  for (const sentence of textBlocks.flatMap(sentencesOf)) {
    if (SOURCE_CLAIMS.test(sentence) && !/\]\(https?:\/\//.test(sentence)) errors.push(`unsourced claim (link a real source in the same sentence): "${sentence.slice(0, 90)}…"`);
  }
  const lower = checkedText.toLowerCase().replace(/[’]/g, "'");
  const banned = [...BANNED.filter((p) => lower.includes(p)), ...new Set([...lower.matchAll(bannedWordRe)].map((m) => m[0]))];
  if (banned.length) errors.push(`banned phrases: ${[...new Set(banned)].map((b) => `"${b}"`).join(", ")}`);
  const seenSentences = new Map();
  for (const s of textBlocks.flatMap((b) => sentencesOf(proseOf(b)))) {
    const n = normalize(s);
    if (n.split(" ").length < 8) continue;
    if (seenSentences.has(n)) errors.push(`repeated sentence: "${s.slice(0, 80)}…"`);
    seenSentences.set(n, true);
  }
  const paragraphs = blocksOf(body)
    .filter((b) => !b.startsWith("#") && !b.startsWith("```") && !b.startsWith("|"))
    .map((b) => proseOf(b))
    .filter((b) => wordCount(b) >= 25)
    .map((b) => ({ text: b, sh: shingles(b) }));
  for (let i = 0; i < paragraphs.length; i++)
    for (let j = i + 1; j < paragraphs.length; j++)
      if (jaccard(paragraphs[i].sh, paragraphs[j].sh) > 0.35) errors.push(`two paragraphs make the same point: "${paragraphs[j].text.trim().slice(0, 70)}…"`);

  // Publishing pace: up to 3 per publish day, publish days 2+ days apart, max 12 per ISO week
  const week = weekCounts[isoWeek(published)] ?? [];
  if (week.length > MAX_POSTS_PER_WEEK && week.indexOf(slug) >= MAX_POSTS_PER_WEEK) {
    errors.push(`more than ${MAX_POSTS_PER_WEEK} posts in week ${isoWeek(published)}; move "published" to a later week`);
  }
  const sameDay = byDate.filter((p) => p.published === published);
  if (sameDay.length > MAX_POSTS_PER_DAY && sameDay.findIndex((p) => p.slug === slug) >= MAX_POSTS_PER_DAY) {
    errors.push(`more than ${MAX_POSTS_PER_DAY} posts on ${published}; move "published" to the next publish day`);
  }
  const sameCluster = sameDay.find((p) => p.slug !== slug && data.cluster && p.data.cluster === data.cluster);
  if (sameCluster) errors.push(`"${sameCluster.slug}" is in the same cluster (${data.cluster}) on the same day; same-day posts must be in different clusters`);
  const prev = previousDayPost(post);
  if (prev && /^\d{4}-\d{2}-\d{2}$/.test(published)) {
    const gap = (Date.parse(published) - Date.parse(prev.published)) / 86400000;
    if (gap < MIN_DAYS_BETWEEN_POSTS) errors.push(`published ${gap} day(s) after "${prev.slug}"; keep at least ${MIN_DAYS_BETWEEN_POSTS} days between publish days (up to ${MAX_POSTS_PER_DAY} posts on one day)`);
  }
  // Distinct questions: title and question H2s vs posts from the last 14 days
  const titleWords = contentWords(data.title);
  const myQuestions = questionH2sOf(body).map((h) => ({ h, w: contentWords(h) })).filter((q) => q.w.size >= 2);
  for (const other of recentPosts(post)) {
    const t = jaccard(titleWords, contentWords(other.data.title));
    if (t >= MAX_TITLE_SIMILARITY) errors.push(`title is too similar to "${other.data.title}" (${other.slug}, ${other.published}); answer a clearly different question`);
    for (const q of myQuestions)
      for (const oh of questionH2sOf(other.body)) {
        const ow = contentWords(oh);
        if (ow.size >= 2 && jaccard(q.w, ow) >= MAX_H2_SIMILARITY) errors.push(`H2 "${q.h}" is too similar to "${oh}" in ${other.slug} (${other.published}); answer a clearly different question`);
      }
  }

  results.push({
    slug,
    role,
    words: count,
    h2: h2s.length,
    internal: internal.length,
    external: external.length,
    faq: faq.length,
    gain: informationGain(post, brief),
    errors: [...new Set(errors)],
    warnings,
  });
}

// ---------- Backlog: clusters, full topic fields, one keyword per topic, long-tail only ----------
const backlogErrors = [];
const seen = new Map();
const keyFields = ["cluster", "pillar", "role", "intent", "funnel", "category", "targetPage", "reader", "angle", "title"];
for (const item of backlog.items ?? []) {
  const name = item.keyword ?? item.title;
  const k = normalize(item.keyword);
  if (!k) backlogErrors.push(`backlog item "${item.title}" has no keyword`);
  else if (seen.has(k)) backlogErrors.push(`backlog keyword "${item.keyword}" appears twice`);
  else seen.set(k, item);
  if (SERVICE_KEYWORDS.some((s) => normalize(s) === k)) backlogErrors.push(`backlog keyword "${item.keyword}" belongs to a service page`);
  if (TOOL_KEYWORDS.some((s) => normalize(s) === k)) backlogErrors.push(`backlog keyword "${item.keyword}" belongs to a tool page`);
  if (SOLUTION_KEYWORDS.some((s) => normalize(s) === k)) backlogErrors.push(`backlog keyword "${item.keyword}" belongs to an industry page`);
  if (HEAD_TERMS.some((h) => normalize(h) === k) || tokens(item.keyword).filter((w) => !STOP.has(w)).length < 3)
    backlogErrors.push(`backlog keyword "${item.keyword}" is a head term (use a long-tail, 3+ word query a new site can win)`);
  for (const f of keyFields) if (!String(item[f] ?? "").trim()) backlogErrors.push(`backlog item "${name}" has no ${f}`);
  const cluster = CLUSTERS.find((c) => c.id === item.cluster);
  if (!cluster) backlogErrors.push(`backlog item "${name}" has unknown cluster "${item.cluster}"`);
  else {
    if (item.pillar !== cluster.pillar.slug) backlogErrors.push(`backlog item "${name}": pillar must be "${cluster.pillar.slug}"`);
    if (!categoryFits(item.category, cluster)) backlogErrors.push(`backlog item "${name}": category must be "${cluster.category}" (or the one linking to ${cluster.servicePage})`);
    for (const sk of item.secondary ?? []) if (PRIMARY_KEYWORDS.includes(normalize(sk))) backlogErrors.push(`backlog item "${name}": secondary "${sk}" is another page's main keyword`);
    if (item.targetPage !== cluster.servicePage) backlogErrors.push(`backlog item "${name}": targetPage must be "${cluster.servicePage}"`);
    if ((item.role === "pillar") !== (normalize(item.keyword) === normalize(cluster.pillar.keyword))) backlogErrors.push(`backlog item "${name}": only the cluster's pillar keyword has role "pillar"`);
  }
  if (!["pillar", "supporting"].includes(item.role)) backlogErrors.push(`backlog item "${name}": role must be pillar or supporting`);
  if (!INTENTS.includes(item.intent)) backlogErrors.push(`backlog item "${name}": intent must be one of ${INTENTS.join(", ")}`);
  if (!FUNNEL.includes(item.funnel)) backlogErrors.push(`backlog item "${name}": funnel must be one of ${FUNNEL.join(", ")}`);
  if (!Array.isArray(item.secondary) || item.secondary.length < 3 || item.secondary.length > 6) backlogErrors.push(`backlog item "${name}" needs 3–6 secondary keywords`);
  if (!Array.isArray(item.questions) || item.questions.length < 2 || item.questions.length > 6) backlogErrors.push(`backlog item "${name}" needs 2–6 question variants`);
  if (String(item.angle ?? "").length < 40) backlogErrors.push(`backlog item "${name}": the angle must say what this post adds that top results don't`);
  if (item.category && !CATEGORIES.some((c) => c.slug === item.category)) backlogErrors.push(`backlog item "${item.keyword}" has unknown category "${item.category}"`);
  if (item.status === "published") {
    const post = parsed.find((p) => p.slug === item.publishedSlug);
    if (!post) backlogErrors.push(`backlog item "${item.keyword}" points to a missing post "${item.publishedSlug}"`);
    else if (normalize(post.data.keyword) !== k) backlogErrors.push(`post "${post.slug}" targets "${post.data.keyword}", but its backlog item says "${item.keyword}"`);
  }
}
for (const c of CLUSTERS) {
  const items = (backlog.items ?? []).filter((i) => i.cluster === c.id);
  const pillars = items.filter((i) => i.role === "pillar");
  const supporting = items.length - pillars.length;
  if (pillars.length !== 1) backlogErrors.push(`cluster "${c.id}" has ${pillars.length} pillar topics (need exactly 1)`);
  if (supporting < 8 || supporting > 15) backlogErrors.push(`cluster "${c.id}" has ${supporting} supporting topics (need 8–15)`);
}
for (const p of parsed) {
  if (!(backlog.items ?? []).some((i) => i.publishedSlug === p.slug)) backlogErrors.push(`post "${p.slug}" has no published backlog item`);
}
if (!existsSync(join(ROOT, "src/app/blog/[slug]/opengraph-image.tsx"))) backlogErrors.push("posts have no per-post OG image route (src/app/blog/[slug]/opengraph-image.tsx)");

// Industry pages (content/solutions): same fact, filler, keyword and link rules as posts.
const solutionResults = only.length
  ? []
  : SOLUTIONS.map(({ slug, data, body }) => {
      const errors = [];
      const keyword = String(data.keyword ?? "");
      const seoTitle = String(data.seoTitle ?? data.title ?? "");
      const description = String(data.description ?? "");
      const faq = Array.isArray(data.faq) ? data.faq : [];
      const list = (k) => (Array.isArray(data[k]) ? data[k] : []);
      const frontText = [
        data.title, seoTitle, description, data.h1, data.h1Accent, data.lead,
        ...list("pains").flatMap((x) => [x.title, x.text]),
        ...list("build").flatMap((x) => [x.title, x.text]),
        ...list("features"),
        ...faq.flatMap((f) => [f.q, f.a]),
      ].map((x) => String(x ?? "")).join(" \n ");
      const prose = proseOf(body);
      const words = wordCount(prose) + wordCount(frontText);
      if (words < 600) errors.push(`only ${words} words (min 600)`);
      if (seoTitle.length + TITLE_SUFFIX.length > 60) errors.push(`<title> is ${seoTitle.length + TITLE_SUFFIX.length} chars with the suffix (max 60)`);
      if (description.length < 150 || description.length > 160) errors.push(`meta description is ${description.length} chars (150–160)`);
      const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);
      if (!keyword) errors.push("missing keyword");
      else {
        if (!containsKeyword(seoTitle, keyword)) errors.push(`keyword "${keyword}" missing from the title`);
        if (!containsKeyword(String(data.lead ?? ""), keyword)) errors.push(`keyword "${keyword}" missing from the lead (first paragraph)`);
        if (!h2s.some((h) => containsKeyword(h, keyword))) errors.push(`keyword "${keyword}" missing from every H2`);
        const k = normalize(keyword);
        if (SOLUTIONS.some((o) => o.slug !== slug && normalize(String(o.data.keyword ?? "")) === k)) errors.push("keyword used by another industry page");
        if (parsed.some((p) => normalize(p.data.keyword) === k)) errors.push("keyword used by a blog post");
        if ((backlog.items ?? []).some((i) => normalize(String(i.keyword ?? "")) === k)) errors.push("keyword is queued in the blog backlog");
        if (SERVICE_KEYWORDS.some((x) => normalize(x) === k)) errors.push("keyword belongs to a service page");
        if (TOOL_KEYWORDS.some((x) => normalize(x) === k)) errors.push("keyword belongs to a tool page");
      }
      if (faq.length < 4 || faq.length > 6) errors.push(`${faq.length} FAQ questions (need 4–6)`);
      const links = [...body.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)\)/g)].map((m) => m[1]);
      const internal = [...new Set(links.filter((l) => l.startsWith("/")))];
      if (internal.length < 2) errors.push(`${internal.length} internal links in the body (min 2)`);
      for (const l of internal) {
        const path = l.split("#")[0].replace(/\/$/, "") || "/";
        if (!KNOWN_ROUTES.has(path)) errors.push(`broken internal link: ${l}`);
      }
      for (const pr of list("projects")) if (!PROJECT_SLUGS.includes(pr)) errors.push(`unknown project "${pr}"`);
      const unknown = [...new Set(numberValues(`${prose} \n ${frontText}`).filter((n) => !ALLOWED_NUMBERS.has(n)))];
      if (unknown.length) errors.push(`numbers not found in content/owner/ or the case studies: ${unknown.join(", ")}`);
      const lower = `${prose} ${frontText}`.toLowerCase();
      const banned = [...BANNED.filter((x) => lower.includes(x)), ...new Set([...lower.matchAll(bannedWordRe)].map((m) => m[0]))];
      if (banned.length) errors.push(`banned phrases: ${banned.map((b) => `"${b}"`).join(", ")}`);
      if (/\b(bahawalpur|lahore|islamabad|karachi)\b/i.test(lower)) errors.push("names a city (industry pages target clients worldwide)");
      return { slug, words, faq: faq.length, internal: internal.length, errors };
    });

const failed = results.filter((r) => r.errors.length);
const failedSolutions = solutionResults.filter((r) => r.errors.length);
if (asJson) {
  console.log(JSON.stringify({ ok: failed.length === 0 && backlogErrors.length === 0 && failedSolutions.length === 0, results, backlogErrors, solutionResults }, null, 2));
} else {
  for (const r of results) {
    console.log(`${r.errors.length ? "FAIL" : "PASS"}  ${r.slug}  (${r.role}, ${r.words} words, ${r.h2} H2, ${r.internal} internal / ${r.external} outside links, ${r.faq} FAQ; gain: ${r.gain.join(", ") || "none"})`);
    for (const e of r.errors) console.log(`      ✗ ${e}`);
    for (const w of r.warnings) console.log(`      ! ${w}`);
  }
  if (!only.length) {
    console.log(backlogErrors.length ? "FAIL  backlog" : `PASS  backlog (${(backlog.items ?? []).length} topics in ${CLUSTERS.length} clusters, keywords unique and long-tail)`);
    for (const e of backlogErrors) console.log(`      ✗ ${e}`);
    for (const r of solutionResults) {
      console.log(`${r.errors.length ? "FAIL" : "PASS"}  solutions/${r.slug}  (${r.words} words, ${r.internal} internal links, ${r.faq} FAQ)`);
      for (const e of r.errors) console.log(`      ✗ ${e}`);
    }
  }
  console.log(`\n${results.length - failed.length}/${results.length} posts passed${offline ? " (outside links not requested: --offline)" : ""}.`);
}
process.exitCode = failed.length || failedSolutions.length || (!only.length && backlogErrors.length) ? 1 : 0;
