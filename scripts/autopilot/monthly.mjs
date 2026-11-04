// Monthly data for reports/YYYY-MM.md: blog posts ranking in positions 8-20 (worth refreshing),
// top queries and pages from Search Console, leads per source from Supabase, and the "measure and
// improve" lists (content/seo/strategy.md):
//   perPost        each post's Search Console queries, with the ones its H2s, FAQ, keywords and
//                  brief don't answer yet (add them as an H2 or FAQ item)
//   lowCtr         posts with many impressions and few clicks (rewrite the title and description)
//   cannibalization queries where 2+ posts get impressions (merge, refresh or re-link them)
//
//   node scripts/autopilot/monthly.mjs            data for the previous calendar month (JSON on stdout)
//   node scripts/autopilot/monthly.mjs 2026-11    a given month
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { ROOT, SITE_URL, briefPath, gscQuery, normalizeKeyword, readPosts, rpc, todayPkt } from "./lib.mjs";

const MIN_QUERY_IMPRESSIONS = 5;
const LOW_CTR = { impressions: 100, ctr: 0.01 };
const STOP = new Set(["a", "an", "the", "is", "are", "your", "my", "of", "to", "in", "on", "it", "for", "and", "with", "how", "do", "does", "what", "can", "i", "vs"]);
const words = (t) => normalizeKeyword(t).split(" ").filter((w) => w && !STOP.has(w)).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
/** What a post already answers: H2s, FAQ questions, main and secondary keywords, the brief's questions. */
const answersOf = (slug) => {
  const file = join(ROOT, "content", "blog", `${slug}.mdx`);
  if (!existsSync(file)) return [];
  const { data, content } = matter(readFileSync(file, "utf8"));
  const brief = existsSync(join(ROOT, briefPath(slug))) ? readFileSync(join(ROOT, briefPath(slug)), "utf8") : "";
  const briefQuestions = (brief.split(/^## Questions to answer/im)[1] ?? "").split(/^## /m)[0].split("\n").filter((l) => /^\s*[-*]/.test(l));
  return [...[...content.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1]), ...(data.faq ?? []).map((q) => q.q), data.keyword, ...(data.secondary ?? []), ...briefQuestions].map(words);
};
const covered = (query, answers) => {
  const q = words(query);
  return !q.length || answers.some((a) => q.filter((w) => a.includes(w)).length / q.length >= 0.6);
};

const arg = process.argv[2];
const month = arg ?? (() => {
  const [y, m] = todayPkt().split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
})();
const [y, m] = month.split("-").map(Number);
const from = `${month}-01T00:00:00+05:00`;
const to = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+05:00`;

const posts = readPosts();
const report = { month, posts: { published: posts.filter((p) => p.published?.startsWith(month)).map((p) => p.slug), total: posts.length }, refresh: [], lowCtr: [], perPost: [], cannibalization: [], topQueries: [], topPages: [], leads: [], errors: [] };

try {
  const pages = await gscQuery({ dimensions: ["page"], days: 28, rowLimit: 500 });
  report.searchConsoleRange = `${pages.start} to ${pages.end}`;
  report.topPages = pages.rows
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 15)
    .map((r) => ({ page: r.keys[0].replace(SITE_URL, "") || "/", clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 }));
  report.refresh = pages.rows
    .filter((r) => r.keys[0].includes("/blog/") && r.position >= 8 && r.position <= 20)
    .map((r) => ({ slug: r.keys[0].split("/blog/")[1].replace(/\/$/, ""), position: Math.round(r.position * 10) / 10, impressions: r.impressions, clicks: r.clicks }))
    .filter((r) => posts.some((p) => p.slug === r.slug))
    .sort((a, b) => b.impressions - a.impressions);
  const blogRows = pages.rows.filter((r) => r.keys[0].includes("/blog/"));
  report.lowCtr = blogRows
    .filter((r) => r.impressions >= LOW_CTR.impressions && r.clicks / r.impressions < LOW_CTR.ctr)
    .map((r) => ({ slug: r.keys[0].split("/blog/")[1].replace(/\/$/, ""), impressions: r.impressions, clicks: r.clicks, ctr: Math.round((r.clicks / r.impressions) * 1000) / 10, position: Math.round(r.position * 10) / 10 }));

  const pairs = await gscQuery({ dimensions: ["page", "query"], days: 28, rowLimit: 5000 });
  const byPost = {};
  const byQuery = {};
  for (const r of pairs.rows) {
    const [page, query] = r.keys;
    if (!page.includes("/blog/") || r.impressions < MIN_QUERY_IMPRESSIONS) continue;
    const slug = page.split("/blog/")[1].replace(/\/$/, "");
    if (!posts.some((p) => p.slug === slug)) continue;
    (byPost[slug] ??= []).push({ query, impressions: r.impressions, clicks: r.clicks, position: Math.round(r.position * 10) / 10 });
    (byQuery[query] ??= []).push({ slug, impressions: r.impressions, position: Math.round(r.position * 10) / 10 });
  }
  report.perPost = Object.entries(byPost).map(([slug, rows]) => {
    const answers = answersOf(slug);
    const sorted = rows.sort((a, b) => b.impressions - a.impressions);
    return { slug, queries: sorted.slice(0, 15), unanswered: sorted.filter((r) => !covered(r.query, answers)).slice(0, 10) };
  });
  report.cannibalization = Object.entries(byQuery)
    .filter(([, rows]) => rows.length > 1)
    .map(([query, rows]) => ({ query, posts: rows.sort((a, b) => b.impressions - a.impressions) }))
    .sort((a, b) => b.posts.reduce((n, p) => n + p.impressions, 0) - a.posts.reduce((n, p) => n + p.impressions, 0))
    .slice(0, 15);

  const queries = await gscQuery({ dimensions: ["query"], days: 28, rowLimit: 50 });
  report.topQueries = queries.rows.slice(0, 20).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 }));
} catch (error) {
  report.errors.push(`Search Console: ${error.message}`);
}
try {
  report.leads = await rpc("app_leads_by_source", { p_from: from, p_to: to });
} catch (error) {
  report.errors.push(`Leads: ${error.message}`);
}
console.log(JSON.stringify(report, null, 2));
