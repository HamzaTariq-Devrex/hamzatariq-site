// Original data for blog posts: anonymised, aggregate results of the free SEO audit tool, queried live
// from Supabase (seo_audits, one row per site, its latest audit; hamzatariq.site excluded).
// Prints JSON with `usable: false` until at least MIN_AUDIT_SITES sites have been audited; posts may
// only quote these numbers when usable, and must copy `query`, `queriedAt` and `sites` into the
// brief's "## Original data" section (content:check reads them from there).
//
//   node scripts/autopilot/audit-stats.mjs
import { MIN_AUDIT_SITES, rpc, todayPkt } from "./lib.mjs";

const QUERY = "select public.app_audit_stats(secret) -- latest audit per host from public.seo_audits, hamzatariq.site excluded";

try {
  const stats = await rpc("app_audit_stats");
  const sites = Number(stats.sites ?? 0);
  const pct = (n) => (sites ? Math.round((n / sites) * 100) : 0);
  const checks = Object.fromEntries(
    Object.entries(stats.checks ?? {}).map(([id, c]) => [id, { ...c, failPct: pct(c.fail), notPassingPct: pct(c.fail + c.warn) }]),
  );
  console.log(
    JSON.stringify(
      {
        usable: sites >= MIN_AUDIT_SITES,
        minSites: MIN_AUDIT_SITES,
        sites,
        queriedAt: todayPkt(),
        query: QUERY,
        range: { from: stats.from, to: stats.to },
        avgScore: stats.avgScore,
        medianScore: stats.medianScore,
        checks,
        note: sites >= MIN_AUDIT_SITES ? "Say how many sites the numbers cover." : `Only ${sites} sites audited so far; skip original data until there are ${MIN_AUDIT_SITES}.`,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(JSON.stringify({ usable: false, error: error.message }, null, 2));
}
