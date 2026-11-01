// Monthly data for reports/YYYY-MM.md: blog posts ranking in positions 8-20 (worth refreshing),
// top queries and pages from Search Console, and leads per source from Supabase.
//
//   node scripts/autopilot/monthly.mjs            data for the previous calendar month (JSON on stdout)
//   node scripts/autopilot/monthly.mjs 2026-11    a given month
import { SITE_URL, gscQuery, readPosts, rpc, todayPkt } from "./lib.mjs";

const arg = process.argv[2];
const month = arg ?? (() => {
  const [y, m] = todayPkt().split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
})();
const [y, m] = month.split("-").map(Number);
const from = `${month}-01T00:00:00+05:00`;
const to = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+05:00`;

const posts = readPosts();
const report = { month, posts: { published: posts.filter((p) => p.published?.startsWith(month)).map((p) => p.slug), total: posts.length }, refresh: [], topQueries: [], topPages: [], leads: [], errors: [] };

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
