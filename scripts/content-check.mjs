// Quality gate for blog posts (rules in content/STYLE.md). A post that fails is never published:
// this runs before every build (prebuild, offline) and in the autopilot (with external link checks).
//
//   npm run content:check                  all posts, external links checked
//   npm run content:check -- --offline     skip external link requests (used by prebuild)
//   npm run content:check -- my-post-slug  only the given post(s)
//   npm run content:check -- --json        machine-readable output
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const POSTS_DIR = join(ROOT, "content", "blog");
const SITE_URL = "https://hamzatariq.site";
const TITLE_SUFFIX = " | Hamza Tariq";
// Pace (CLAUDE.md): one post every 2 days at most, so max 4 per ISO week.
const MIN_DAYS_BETWEEN_POSTS = 2;
const MAX_POSTS_PER_WEEK = 4;

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const asJson = args.includes("--json");
const only = args.filter((a) => !a.startsWith("--")).map((a) => a.replace(/\.mdx$/, "").split(/[\\/]/).pop());

const read = (path) => (existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), "utf8") : "");
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
const KNOWN_ROUTES = new Set([
  ...STATIC_ROUTES,
  ...SERVICE_SLUGS.map((s) => `/services/${s}`),
  ...[...PROJECT_SLUGS, ...CASE_SLUGS].map((s) => `/work/${s}`),
  ...POST_SLUGS.map((s) => `/blog/${s}`),
  ...CATEGORIES.map((c) => `/blog/category/${c.slug}`),
  ...SOLUTIONS.map((x) => `/solutions/${x.slug}`),
]);

// ---------- Text helpers ----------
const BANNED = [
  "in today's digital world", "in today's digital age", "in today's fast-paced", "in the ever-evolving", "ever-changing landscape",
  "unlock the power", "unleash", "look no further", "game-changer", "game changer", "delve", "dive deep", "deep dive", "elevate your",
  "it's important to note", "it is important to note", "in conclusion", "navigating the", "tapestry", "embark", "cutting-edge",
  "revolutionize", "supercharge", "seamless", "harness the power", "at the end of the day", "without further ado", "a testament to",
];
const STOP = new Set(["a", "an", "the", "is", "are", "your", "my", "of", "to", "in", "on", "it", "its", "this", "that", "i", "we", "you", "our", "for", "and", "with", "how", "do", "does"]);
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/node\.?js/g, "nodejs")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const tokens = (text) => normalize(text).split(" ").filter(Boolean);
const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const same = (a, b) => stem(a) === stem(b);

/** Keyword tokens appear in order; up to 2 stop words may sit between them ("react website is not ranking"). */
const containsKeyword = (text, keyword) => {
  const t = tokens(text);
  const k = tokens(keyword);
  for (let start = 0; start < t.length; start++) {
    if (!same(t[start], k[0])) continue;
    let i = start + 1;
    let ok = true;
    for (let j = 1; j < k.length && ok; j++) {
      let skipped = 0;
      while (i < t.length && !same(t[i], k[j]) && STOP.has(t[i]) && skipped < 2) {
        i++;
        skipped++;
      }
      if (i < t.length && same(t[i], k[j])) i++;
      else ok = false;
    }
    if (ok) return true;
  }
  return false;
};
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
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, " ")
    .replace(/https?:\/\/\S+/g, " ");
const wordCount = (text) => text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;

const firstParagraph = (body) => {
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.find((b) => !b.startsWith("#") && !b.startsWith("<") && !b.startsWith("import ") && !b.startsWith("|") && !b.startsWith("```")) ?? "";
};

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
    if (status === 403 || status === 429) return { ok: true, warn: `${url} answered ${status} (blocks bots?)` };
    return status < 400 ? { ok: true } : { ok: false, error: `${url} returned ${status}` };
  } catch (error) {
    return { ok: false, error: `${url} could not be reached (${error.name})` };
  }
};

// ---------- Checks ----------
const parsed = POST_FILES.map((file) => {
  const { data, content } = matter(readFileSync(join(POSTS_DIR, file), "utf8"));
  return { file, slug: file.replace(/\.mdx$/, ""), data, body: content };
});
const posts = only.length ? parsed.filter((p) => only.includes(p.slug)) : parsed;
if (only.length && posts.length !== only.length) {
  console.error(`Unknown post(s): ${only.filter((s) => !parsed.some((p) => p.slug === s)).join(", ")}`);
  process.exit(1);
}

const dateOf = (p) => (p.data.published instanceof Date ? p.data.published.toISOString().slice(0, 10) : String(p.data.published ?? ""));
const byDate = [...parsed].sort((a, b) => dateOf(a).localeCompare(dateOf(b)) || a.slug.localeCompare(b.slug));
const weekCounts = {};
for (const p of byDate) {
  const week = isoWeek(dateOf(p));
  weekCounts[week] = [...(weekCounts[week] ?? []), p.slug];
}
/** The post published just before this one (same-day ties by slug), for the 2-day gap rule. */
const previousPost = (slug) => byDate[byDate.findIndex((p) => p.slug === slug) - 1] ?? null;

const results = [];
for (const post of posts) {
  const errors = [];
  const warnings = [];
  const { data, body, slug } = post;
  const prose = proseOf(body);
  const faq = Array.isArray(data.faq) ? data.faq : [];
  const keyword = String(data.keyword ?? "").trim();
  const seoTitle = String(data.seoTitle ?? data.title ?? "");
  const description = String(data.description ?? "");
  const published = data.published instanceof Date ? data.published.toISOString().slice(0, 10) : String(data.published ?? "");

  // Length and structure
  const words = wordCount(prose);
  if (words < 1300) errors.push(`only ${words} words (min 1300)`);
  if (words > 2000) errors.push(`${words} words (max 2000)`);
  const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);
  if (h2s.length < 5 || h2s.length > 8) errors.push(`${h2s.length} H2 headings (need 5–8)`);
  if (!data.title) errors.push("missing title");
  if (seoTitle.length + TITLE_SUFFIX.length > 60) errors.push(`<title> is ${seoTitle.length + TITLE_SUFFIX.length} chars with the suffix (max 60)`);
  if (description.length < 150 || description.length > 160) errors.push(`meta description is ${description.length} chars (150–160)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) errors.push("published must be YYYY-MM-DD");

  // Keyword placement and uniqueness
  if (!keyword) errors.push("missing keyword");
  else {
    if (!containsKeyword(seoTitle, keyword)) errors.push(`keyword "${keyword}" missing from the title`);
    if (!slugHasKeyword(slug, keyword)) errors.push(`keyword "${keyword}" missing from the slug`);
    if (!containsKeyword(firstParagraph(body), keyword)) errors.push(`keyword "${keyword}" missing from the first paragraph`);
    if (!h2s.some((h) => containsKeyword(h, keyword))) errors.push(`keyword "${keyword}" missing from every H2`);
    const k = normalize(keyword);
    const dupPost = parsed.find((p) => p.slug !== slug && normalize(String(p.data.keyword ?? "")) === k);
    if (dupPost) errors.push(`keyword already used by post "${dupPost.slug}"`);
    if (SERVICE_KEYWORDS.some((s) => normalize(s) === k)) errors.push("keyword already targeted by a service page");
    if (TOOL_KEYWORDS.some((s) => normalize(s) === k)) errors.push("keyword already targeted by a tool page");
    if (SOLUTION_KEYWORDS.some((s) => normalize(s) === k)) errors.push("keyword already targeted by an industry page");
  }

  // Category and CTA
  const category = CATEGORIES.find((c) => c.slug === data.category);
  if (!category) errors.push(`unknown category "${data.category}"`);
  else if (!category.cta?.href) errors.push("category has no CTA");

  // Links
  const links = [...body.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
  const internal = [...new Set(links.filter((l) => l.startsWith("/") || l.startsWith(SITE_URL)).map((l) => (l.startsWith(SITE_URL) ? l.slice(SITE_URL.length) || "/" : l)))];
  const external = [...new Set(links.filter((l) => /^https?:\/\//.test(l) && !l.startsWith(SITE_URL)))];
  if (internal.length < 3) errors.push(`${internal.length} internal links (min 3)`);
  if (!internal.some((l) => /^\/(services\/|hire|tools\/)/.test(l))) errors.push("no link to a service page, /hire or a tool");
  if (external.length < 1) errors.push("no link to a trusted outside source");
  if (external.length > 3) warnings.push(`${external.length} outside links (aim for 1–2)`);
  for (const l of internal) {
    const path = l.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
    if (!KNOWN_ROUTES.has(path)) errors.push(`broken internal link: ${l}`);
  }
  if (!offline) {
    for (const url of external) {
      const r = await checkExternal(url);
      if (!r.ok) errors.push(`broken link: ${r.error}`);
      if (r.warn) warnings.push(r.warn);
    }
  }

  // Required blocks
  if (faq.length < 4 || faq.length > 5) errors.push(`${faq.length} FAQ questions (need 4–5)`);
  if (faq.some((f) => !f?.q || !f?.a)) errors.push("an FAQ item is missing its question or answer");
  if (!/<FromMyWork[\s>]/.test(body)) errors.push('no "From my work" box (<FromMyWork>)');
  const images = [...body.matchAll(/!\[([^\]]*)\]\(/g)].map((m) => m[1]);
  if (images.some((alt) => !alt.trim())) errors.push("an image has no alt text");
  const figures = [...body.matchAll(/<Figure([\s\S]*?)\/>/g)].map((m) => m[1]);
  if (figures.some((attrs) => !/alt="[^"]+"/.test(attrs))) errors.push("a <Figure> has no alt text");
  if (data.cover && !String(data.cover.alt ?? "").trim()) errors.push("cover image has no alt text");

  // Facts: numbers must come from content/owner/ or the case studies
  const checkedText = [prose, String(data.title ?? ""), seoTitle, description, ...faq.flatMap((f) => [f.q, f.a])].join(" \n ");
  const unknown = [...new Set(numberValues(checkedText).filter((n) => !ALLOWED_NUMBERS.has(n)))];
  if (unknown.length) errors.push(`numbers not found in content/owner/ or the case studies: ${unknown.join(", ")}`);

  // Filler
  const lower = checkedText.toLowerCase();
  const banned = BANNED.filter((p) => lower.includes(p));
  if (banned.length) errors.push(`banned phrases: ${banned.map((b) => `"${b}"`).join(", ")}`);

  // Publishing pace
  const week = weekCounts[isoWeek(published)] ?? [];
  if (week.length > MAX_POSTS_PER_WEEK && week.indexOf(slug) >= MAX_POSTS_PER_WEEK) {
    errors.push(`more than ${MAX_POSTS_PER_WEEK} posts in week ${isoWeek(published)}; move "published" to a later week`);
  }
  const prev = previousPost(slug);
  if (prev && /^\d{4}-\d{2}-\d{2}$/.test(published)) {
    const gap = (Date.parse(published) - Date.parse(dateOf(prev))) / 86400000;
    if (gap < MIN_DAYS_BETWEEN_POSTS) errors.push(`published ${gap} day(s) after "${prev.slug}"; keep at least ${MIN_DAYS_BETWEEN_POSTS} days between posts`);
  }

  results.push({ slug, words, h2: h2s.length, internal: internal.length, external: external.length, faq: faq.length, errors, warnings });
}

// Backlog: one keyword per topic, and none taken by a service or tool page
const backlogErrors = [];
const backlog = JSON.parse(read("content/backlog.json") || '{"items":[]}');
const seen = new Map();
for (const item of backlog.items ?? []) {
  const k = normalize(String(item.keyword ?? ""));
  if (!k) backlogErrors.push(`backlog item "${item.title}" has no keyword`);
  else if (seen.has(k)) backlogErrors.push(`backlog keyword "${item.keyword}" appears twice`);
  else seen.set(k, item);
  if (SERVICE_KEYWORDS.some((s) => normalize(s) === k)) backlogErrors.push(`backlog keyword "${item.keyword}" belongs to a service page`);
  if (TOOL_KEYWORDS.some((s) => normalize(s) === k)) backlogErrors.push(`backlog keyword "${item.keyword}" belongs to a tool page`);
  if (SOLUTION_KEYWORDS.some((s) => normalize(s) === k)) backlogErrors.push(`backlog keyword "${item.keyword}" belongs to an industry page`);
  if (item.category && !CATEGORIES.some((c) => c.slug === item.category)) backlogErrors.push(`backlog item "${item.keyword}" has unknown category "${item.category}"`);
  if (item.status === "published") {
    const post = parsed.find((p) => p.slug === item.publishedSlug);
    if (!post) backlogErrors.push(`backlog item "${item.keyword}" points to a missing post "${item.publishedSlug}"`);
    else if (normalize(String(post.data.keyword ?? "")) !== k) backlogErrors.push(`post "${post.slug}" targets "${post.data.keyword}", but its backlog item says "${item.keyword}"`);
  }
}
for (const p of parsed) {
  if (!(backlog.items ?? []).some((i) => i.publishedSlug === p.slug)) backlogErrors.push(`post "${p.slug}" has no published backlog item`);
}

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
        if (parsed.some((p) => normalize(String(p.data.keyword ?? "")) === k)) errors.push("keyword used by a blog post");
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
      const banned = BANNED.filter((x) => lower.includes(x));
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
    console.log(`${r.errors.length ? "FAIL" : "PASS"}  ${r.slug}  (${r.words} words, ${r.h2} H2, ${r.internal} internal / ${r.external} outside links, ${r.faq} FAQ)`);
    for (const e of r.errors) console.log(`      ✗ ${e}`);
    for (const w of r.warnings) console.log(`      ! ${w}`);
  }
  if (!only.length) {
    console.log(backlogErrors.length ? "FAIL  backlog" : `PASS  backlog (${(backlog.items ?? []).length} topics, keywords unique)`);
    for (const e of backlogErrors) console.log(`      ✗ ${e}`);
    for (const r of solutionResults) {
      console.log(`${r.errors.length ? "FAIL" : "PASS"}  solutions/${r.slug}  (${r.words} words, ${r.internal} internal links, ${r.faq} FAQ)`);
      for (const e of r.errors) console.log(`      ✗ ${e}`);
    }
  }
  console.log(`\n${results.length - failed.length}/${results.length} posts passed${offline ? " (outside links not requested: --offline)" : ""}.`);
}
process.exitCode = failed.length || failedSolutions.length || (!only.length && backlogErrors.length) ? 1 : 0;
