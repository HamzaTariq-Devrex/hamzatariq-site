// Crawls the live sitemap with the SEO Command Center's crawler and prints the issues it finds,
// without touching the database (the same rules as the daily analysis; link checks included).
//   npx tsx scripts/seo-crawl.ts            all sitemap URLs
//   npx tsx scripts/seo-crawl.ts /blog/x    only these paths (no duplicate/orphan checks)
//   JSON=1 npx tsx scripts/seo-crawl.ts     machine-readable output
import { checkLink, crawlPage, pool, sitemapPaths } from "../src/lib/seo-center/crawl";
import { crawlIssues } from "../src/lib/seo-center/analyse";
import { SITE_ORIGIN, templateOf } from "../src/lib/seo-center/config";
import type { LinkRow, PageRow } from "../src/lib/seo-center/db";

const main = async () => {
  const only = process.argv.slice(2);
  const list = only.length ? only.map((path) => ({ path, template: templateOf(path) })) : await sitemapPaths();
  const now = new Date().toISOString();
  const crawled = await pool(list, 6, Date.now() + 10 * 60_000, (p) => crawlPage(p.path));
  const pages: PageRow[] = crawled.map((c) => ({
    ...c,
    template: templateOf(c.path),
    in_sitemap: true,
    crawled_at: now,
    inspected_at: null,
    index_verdict: null,
    coverage_state: null,
    robots_state: null,
    indexing_state: null,
    page_fetch_state: null,
    google_canonical: null,
    last_google_crawl: null,
  }));
  const inSitemap = new Set(pages.map((p) => p.path));
  const urls = new Set<string>();
  for (const p of pages) {
    for (const to of p.links_out) if (!inSitemap.has(to)) urls.add(`${SITE_ORIGIN}${to}`);
    for (const u of p.external_links) urls.add(u);
  }
  const failed = (c: { status: number | null }) => c.status == null || c.status >= 400;
  const checked = await pool([...urls], 8, Date.now() + 5 * 60_000, checkLink);
  // Re-check failures once after a pause: a link is broken only when it fails twice.
  await new Promise((r) => setTimeout(r, 5000));
  const again = new Map((await pool(checked.filter(failed).map((c) => c.url), 4, Date.now() + 2 * 60_000, checkLink)).map((c) => [c.url, c]));
  const links: LinkRow[] = checked.map((c) => {
    const second = again.get(c.url);
    return { ...(second ?? c), checked_at: now, found_on: [], fail_count: failed(c) ? (second && failed(second) ? 2 : 0) : 0 };
  });
  const { issues, fixes } = crawlIssues(pages, links, []);
  if (process.env.JSON === "1") {
    console.log(JSON.stringify({ pages: pages.length, links: links.length, issues, fixes }, null, 2));
    return;
  }
  console.log(`${pages.length} pages crawled, ${links.length} links checked, ${issues.length} issues, ${fixes.length} fixes (${fixes.filter((f) => f.risk === "safe").length} safe)\n`);
  const bySev = { error: 0, warning: 0, notice: 0 };
  for (const i of issues) bySev[i.severity]++;
  console.log(bySev);
  for (const sev of ["error", "warning", "notice"] as const) {
    for (const i of issues.filter((x) => x.severity === sev)) console.log(`${sev.padEnd(7)} ${i.path.padEnd(52)} ${i.type.padEnd(20)} ${i.detail}`);
  }
};

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
