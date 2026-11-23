// The SEO sync job (pg_cron → /api/seo/sync every hour). Each step runs only when it is due and
// while there is time left, so one call never runs over the function limit and a step that fails
// never stops the others. Order: sitemap list → Search Console (daily + 16-month backfill) →
// sitemaps → URL Inspection → crawl → link checks → Core Web Vitals → Bing → analysis → weekly email.
import { addDays, CWV_TEMPLATES, todayPkt } from "./config";
import { db, type SearchRow } from "./db";
import { hasGsc, inspectUrl, listSitemaps, searchAnalytics } from "./google";
import { bingRelated, bingStats, hasBing } from "./bing";
import { checkLink, crawlPage, pool, sitemapPaths } from "./crawl";
import { measureCwv } from "./cwv";
import { crawlIssues, keywordIdeas, searchOpportunities, type SearchData } from "./analyse";
import { sendWeeklyReport } from "./weekly";
import { CLUSTERS } from "@/lib/blog";
import { SITE_ORIGIN } from "./config";

export const STEPS = ["sitemap", "gsc", "backfill", "sitemaps", "inspect", "crawl", "links", "cwv", "bing", "analyse", "weekly"] as const;
export type Step = (typeof STEPS)[number];

const HOUR = 3_600_000;
const older = (at: string | null | undefined, hours: number) => !at || Date.now() - Date.parse(at) > hours * HOUR;
/** Search Console keeps 16 months. */
const BACKFILL_DAYS = 486;

type Result = Record<string, unknown>;

const google = (rows: Awaited<ReturnType<typeof searchAnalytics>>): SearchRow[] => rows.map((r) => ({ engine: "google", ...r }));

/** All four groupings (total, page, query, page x query) for a date range. */
const syncGsc = async (start: string, end: string) => {
  const sets = await Promise.all([searchAnalytics(start, end, []), searchAnalytics(start, end, ["page"]), searchAnalytics(start, end, ["query"]), searchAnalytics(start, end, ["page", "query"])]);
  return db.upsertSearch(sets.flatMap(google));
};

export const runSync = async (budgetMs = 50_000, only?: Step[], force: Step[] = []) => {
  const deadline = Date.now() + budgetMs;
  const left = () => deadline - Date.now();
  const want = (s: Step) => !only || only.includes(s);
  const out: Result = {};
  const state = await db.state();
  const patch: Record<string, unknown> = {};

  const step = async (name: Step, due: boolean, minMs: number, fn: () => Promise<unknown>) => {
    if (!want(name) || !(due || force.includes(name))) return;
    if (left() < minMs) {
      out[name] = "skipped: no time left";
      return;
    }
    try {
      out[name] = (await fn()) ?? "ok";
    } catch (e) {
      out[name] = `error: ${(e as Error).message}`;
    }
  };

  await step("sitemap", older(state.crawl_list_at, 20), 5_000, async () => {
    const paths = await sitemapPaths();
    await db.setSitemapPaths(paths);
    patch.crawl_list_at = new Date().toISOString();
    return `${paths.length} URLs`;
  });

  await step("gsc", hasGsc() && older(state.gsc_synced_at, 20), 15_000, async () => {
    // The last 3 days plus 2 more for late data (Search Console lags 2–3 days); rows are upserted.
    const end = addDays(todayPkt(), -1);
    const n = await syncGsc(addDays(end, -4), end);
    patch.gsc_synced_at = new Date().toISOString();
    return `${n} rows`;
  });

  await step("backfill", hasGsc() && !state.gsc_backfill_done, 15_000, async () => {
    const limit = addDays(todayPkt(), -BACKFILL_DAYS);
    let before = state.gsc_backfill_before ?? addDays(todayPkt(), -5);
    let n = 0;
    while (left() > 12_000 && before > limit) {
      const start = addDays(before, -30) < limit ? limit : addDays(before, -30);
      n += await syncGsc(start, addDays(before, -1));
      before = start;
      patch.gsc_backfill_before = before;
    }
    if (before <= limit) patch.gsc_backfill_done = true;
    return `${n} rows, back to ${before}`;
  });

  await step("sitemaps", hasGsc() && older(state.sitemaps_synced_at, 20), 5_000, async () => {
    const list = await listSitemaps();
    await db.saveSitemaps(list);
    patch.sitemaps_synced_at = new Date().toISOString();
    return `${list.length} sitemaps`;
  });

  await step("inspect", hasGsc(), 8_000, async () => {
    // Each URL about once a week; Search Console allows 2,000 inspections a day per property.
    const due = await db.pagesDue("inspect", 24 * 7, 40);
    const rows = await pool(due, 4, deadline - 6_000, async (path) => {
      try {
        return { path, ...(await inspectUrl(`${SITE_ORIGIN}${path === "/" ? "" : path}`)) };
      } catch (e) {
        return { path, error: (e as Error).message };
      }
    });
    const ok = rows.filter((r) => !("error" in r));
    if (ok.length) await db.saveInspection(ok);
    const failed = rows.find((r) => "error" in r) as { error: string } | undefined;
    // Totals, so a run with nothing due (each URL is inspected weekly) doesn't read as "not running".
    const pages = (await db.allPages()).filter((p) => p.in_sitemap);
    const inspected = pages.filter((p) => p.inspected_at);
    const by = new Map<string, number>();
    for (const p of inspected) by.set(p.coverage_state ?? "no answer", (by.get(p.coverage_state ?? "no answer") ?? 0) + 1);
    const summary = [...by].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(", ");
    return `${ok.length} inspected this run${failed ? `, ${rows.length - ok.length} failed (${failed.error})` : ""} · ${inspected.length}/${pages.length} sitemap URLs inspected in the last 7 days: ${summary || "none yet"}`;
  });

  await step("crawl", true, 6_000, async () => {
    const due = await db.pagesDue("crawl", 22, 400);
    if (!due.length) return "up to date";
    const rows = await pool(due, 6, deadline - 5_000, crawlPage);
    for (let i = 0; i < rows.length; i += 100) await db.saveCrawl(rows.slice(i, i + 100));
    return `${rows.length} of ${due.length} due pages crawled`;
  });

  await step("links", true, 6_000, async () => {
    // Register every link that is not a crawled sitemap page (outside sites + internal pages outside the sitemap).
    const pages = await db.allPages();
    const inSitemap = new Set(pages.filter((p) => p.in_sitemap).map((p) => p.path));
    const found = new Map<string, Set<string>>();
    for (const p of pages.filter((x) => x.in_sitemap && x.crawled_at)) {
      for (const to of p.links_out) if (!inSitemap.has(to)) (found.get(`${SITE_ORIGIN}${to}`) ?? found.set(`${SITE_ORIGIN}${to}`, new Set()).get(`${SITE_ORIGIN}${to}`)!).add(p.path);
      for (const u of p.external_links) (found.get(u) ?? found.set(u, new Set()).get(u)!).add(p.path);
    }
    if (!found.size) return "no links yet";
    await db.registerLinks([...found].map(([url, on]) => ({ url, found_on: [...on] })));
    const due = await db.linksDue(60);
    const rows = await pool(due, 6, deadline - 4_000, checkLink);
    if (rows.length) await db.saveLinks(rows);
    const all = await db.allLinks();
    const checked = all.filter((l) => l.checked_at);
    const broken = checked.filter((l) => l.status === null || l.status >= 400).length;
    return `${rows.length} checked this run · ${checked.length}/${all.length} links checked, ${broken} broken or unreachable`;
  });

  await step("cwv", true, 30_000, async () => {
    const done = new Set(await db.cwvMeasuredToday());
    const paths = (await db.allPages()).filter((p) => p.in_sitemap).map((p) => p.path);
    const next = CWV_TEMPLATES.filter((t) => !done.has(t.template)).map((t) => ({ template: t.template, path: t.pick(paths) })).filter((t) => t.path);
    if (!next.length) return "measured today";
    const t = next[0];
    await db.saveCwv(await measureCwv(t.template, t.path!));
    if (next.length === 1) patch.cwv_synced_at = new Date().toISOString();
    return `${t.template} (${t.path}), ${next.length - 1} left today`;
  });

  await step("bing", hasBing() && older(state.bing_synced_at, 20), 8_000, async () => {
    const rows = await bingStats();
    const n = await db.upsertSearch(rows);
    patch.bing_synced_at = new Date().toISOString();
    return `${n} rows`;
  });

  await step("analyse", older(state.analysed_at, 20), 10_000, async () => {
    const [pages, links, cwv] = await Promise.all([db.allPages(), db.allLinks(), db.cwvLatest()]);
    const sitemap = pages.filter((p) => p.in_sitemap);
    // Wait for a complete crawl (pages crawled in the last day) so duplicates and orphans are right.
    if (!force.includes("analyse") && sitemap.some((p) => older(p.crawled_at, 26))) return "waiting for the crawl to finish";
    const crawl = crawlIssues(pages, links, cwv);

    let search: SearchData | null = null;
    const latest = await db.latestDay("google");
    if (latest) {
      const from = addDays(latest, -27);
      const [pairs, pg, pgPrev, queries, queries90, bingQueries] = await Promise.all([
        db.agg("google", "pair", from, latest),
        db.agg("google", "page", from, latest),
        db.agg("google", "page", addDays(latest, -55), addDays(latest, -28)),
        db.agg("google", "query", from, latest),
        db.agg("google", "query", addDays(latest, -89), latest),
        db.agg("bing", "query", addDays(todayPkt(), -90), todayPkt()),
      ]);
      search = { range: { from, to: latest }, pairs, pages: pg, pagesPrev: pgPrev, queries, queries90, bingQueries };
    }
    const found = search ? searchOpportunities(search, pages) : { opps: [], fixes: [] };

    const related: { seed: string; keyword: string; impressions: number }[] = [];
    if (hasBing()) {
      for (const c of CLUSTERS) {
        if (left() < 6_000) break;
        try {
          related.push(...(await bingRelated(c.pillar.keyword)).map((k) => ({ seed: c.pillar.keyword, ...k })));
        } catch {
          // Bing keyword data is optional.
        }
      }
    }
    const ideas = keywordIdeas(search, related);

    await db.replaceIssues(crawl.issues);
    await db.replaceOpportunities(found.opps);
    if (ideas.length) await db.upsertKeywords(ideas);
    const added = await db.addFixes([...found.fixes, ...crawl.fixes]);
    const tracked = await db.trackFixes();
    patch.analysed_at = new Date().toISOString();
    return { issues: crawl.issues.length, opportunities: found.opps.length, ideas: ideas.length, newFixes: added, tracked, searchRange: search?.range ?? null };
  });

  // Weekly email: Monday from 9:00 PKT, once.
  const now = new Date(Date.now() + 5 * HOUR);
  const monday = now.getUTCDay() === 1 && now.getUTCHours() >= 9;
  await step("weekly", monday && state.weekly_sent_on !== todayPkt(), 5_000, async () => {
    await sendWeeklyReport(await db.weekly());
    patch.weekly_sent_on = todayPkt();
    return "sent";
  });

  patch.last_run_at = new Date().toISOString();
  patch.last_run = out;
  await db.setState(patch);
  return out;
};
