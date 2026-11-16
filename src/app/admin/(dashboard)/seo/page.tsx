import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PAGE_SIZE } from "@/lib/admin/data";
import { formatDate } from "@/lib/admin/labels";
import { BarList, Change, EmptyState, PageHead, StatCard } from "@/components/admin/ui";
import { SkeletonCard, SkeletonStats } from "@/components/admin/Skeleton";
import { FixButtons, KeywordButtons, SyncButton } from "@/components/admin/seo/SeoActions";
import CopyUrls from "@/components/admin/seo/CopyUrls";
import { orderForIndexing } from "@/lib/seo-center/indexing";
import { TEMPLATE_LABELS, type Template } from "@/lib/seo-center/config";
import {
  getSeoOverview,
  getSeoPages,
  getSeoQueries,
  ownerDb,
  type FixRow,
  type IssueRow,
  type KeywordRow,
  type OpportunityRow,
} from "@/lib/seo-center/admin";

const DailyBars = dynamic(() => import("@/components/admin/DailyBars"));

export const metadata: Metadata = { title: "SEO" };
export const maxDuration = 60; // "Sync now" runs the sync inside this route

const TABS = [
  ["overview", "Overview"],
  ["opportunities", "Opportunities"],
  ["fixes", "Fixes"],
  ["pages", "Pages"],
  ["queries", "Queries"],
  ["keywords", "Keywords"],
  ["issues", "Issues"],
] as const;
type Tab = (typeof TABS)[number][0];

const OPP_KINDS = [
  ["striking", "Striking distance", "Queries at positions 8–20: the page that can move up."],
  ["low_ctr", "Low CTR", "Pages whose CTR is under half of the site's own CTR at that position: rewrite title and description."],
  ["missing_page", "Missing pages", "Queries with impressions that no page or backlog topic targets."],
  ["cannibal", "Cannibalisation", "Two or more pages share a query's impressions."],
  ["not_indexed", "Not indexed", "Sitemap pages Google hasn't indexed, with Google's reason."],
  ["losing", "Losing clicks", "Pages down 30%+ in clicks vs the 28 days before."],
] as const;

const FIX_STATUSES = [
  ["waiting", "Waiting for approval"],
  ["auto", "Safe, queued"],
  ["queued", "Approved, queued"],
  ["done", "Done"],
  ["failed", "Failed"],
  ["dismissed", "Dismissed"],
] as const;
const FIX_STATUS_LABEL: Record<string, string> = Object.fromEntries(FIX_STATUSES);

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pageOf = (sp: Search) => Math.max(0, Number(one(sp.page)) || 0);
const n = (v: number | null | undefined) => (v == null ? "–" : v.toLocaleString("en-US"));
const ctr = (c: number, i: number) => (i ? `${Math.round((c / i) * 1000) / 10}%` : "–");
const SITE = "https://hamzatariq.site";

const Failed = ({ what, message }: { what: string; message: string }) => (
  <p className="adm-error" role="alert">
    Could not load {what}: {message}
  </p>
);

const href = (params: Record<string, string | number | undefined>) =>
  `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))}`;

const Pager = ({ params, page, total }: { params: Record<string, string>; page: number; total: number }) =>
  total > PAGE_SIZE ? (
    <nav className="ox-pager" aria-label="Pages">
      {page > 0 ? <Link href={href({ ...params, page: page - 1 })}>← Previous</Link> : <span />}
      <span className="adm-muted">
        {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
      </span>
      {(page + 1) * PAGE_SIZE < total ? <Link href={href({ ...params, page: page + 1 })}>Next →</Link> : <span />}
    </nav>
  ) : null;

const Filters = ({ tab, name, value, options }: { tab: Tab; name: string; value: string; options: readonly (readonly [string, string, ...string[]])[] }) => (
  <nav className="seo-chips" aria-label="Filter">
    {options.map(([key, label]) => (
      <Link key={key} href={href({ tab, [name]: key })} className={key === value ? "is-active" : ""} aria-current={key === value ? "true" : undefined}>
        {label}
      </Link>
    ))}
  </nav>
);

const SearchForm = ({ tab, q, sort, sorts }: { tab: Tab; q: string; sort: string; sorts: [string, string][] }) => (
  <form className="seo-toolbar" action="" method="get">
    <input type="hidden" name="tab" value={tab} />
    <input className="adm-search" type="search" name="q" defaultValue={q} placeholder="Search…" aria-label="Search" />
    <select name="sort" defaultValue={sort} aria-label="Sort" className="adm-search">
      {sorts.map(([k, l]) => (
        <option key={k} value={k}>
          {l}
        </option>
      ))}
    </select>
    <button type="submit" className="adm-btn">
      Apply
    </button>
  </form>
);

const PageLink = ({ path }: { path: string | null }) =>
  path ? (
    <a href={`${SITE}${path}`} target="_blank" rel="noreferrer" className="seo-path">
      {path}
    </a>
  ) : (
    <span className="adm-muted">–</span>
  );

// ---------------------------------------------------------------- Not indexed (for "Request indexing")

/** Sitemap pages Google hasn't indexed (last URL Inspection), most important first. */
const unindexed = async () => {
  const { data, error } = await (await ownerDb())
    .from("seo_pages")
    .select("path, coverage_state")
    .eq("in_sitemap", true)
    .not("inspected_at", "is", null)
    .neq("index_verdict", "PASS");
  if (error) throw new Error(error.message);
  const state = new Map(((data ?? []) as { path: string; coverage_state: string | null }[]).map((r) => [r.path, r.coverage_state]));
  return orderForIndexing([...state.keys()]).map((r) => ({ ...r, state: state.get(r.path) ?? "Not indexed" }));
};

async function Unindexed() {
  let rows;
  try {
    rows = await unindexed();
  } catch (e) {
    return <Failed what="unindexed pages" message={(e as Error).message} />;
  }
  if (!rows.length) return null;
  const urls = rows.map((r) => r.url);
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>Request indexing</h2>
        <span className="seo-actions">
          <CopyUrls urls={urls.slice(0, 10)} label="Copy top 10" />
          <CopyUrls urls={urls} />
        </span>
      </div>
      <p className="adm-muted seo-small">
        Most important first: pillar posts, industry pages, tools, then the rest. Paste each URL into Search Console&apos;s URL Inspection and click &quot;Request indexing&quot; (about 10 a day). A page leaves this list after the next
        weekly inspection finds it indexed.
      </p>
      <ol className="seo-urls">
        {rows.map((r) => (
          <li key={r.path}>
            <code>{r.url}</code> <small className="adm-muted">{r.group} · {r.state}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- Overview

async function Overview() {
  let o;
  try {
    o = await getSeoOverview();
  } catch (e) {
    return <Failed what="SEO data" message={(e as Error).message} />;
  }
  const s = o.state;
  const pos = (v: number | null) => (v == null ? "–" : String(v));
  const issues = (o.issues.error ?? 0) + (o.issues.warning ?? 0) + (o.issues.notice ?? 0);
  const oppTotal = Object.values(o.opportunities).reduce((a, b) => a + b, 0);
  const fixTotal = Object.values(o.fixes).reduce((a, b) => a + b, 0);
  const notIndexed = await unindexed().catch(() => []);
  return (
    <>
      {!s.gsc_synced_at && (
        <p className="seo-note" role="status">
          <strong>Search Console isn&apos;t connected yet.</strong> Clicks, queries, index status and opportunities appear after the first sync with
          <code> GSC_SERVICE_ACCOUNT_JSON</code> set in Vercel. Crawl, speed and issues work already.
        </p>
      )}
      <section className="adm-stats" aria-label="Search performance">
        <StatCard label="Clicks (28 days)" value={n(o.cur?.clicks ?? 0)}>
          <Change current={o.cur?.clicks ?? 0} previous={o.end ? (o.prev?.clicks ?? 0) : null} label={o.end ? "vs the 28 days before" : "No data yet"} />
        </StatCard>
        <StatCard label="Impressions (28 days)" value={n(o.cur?.impressions ?? 0)}>
          <Change current={o.cur?.impressions ?? 0} previous={o.end ? (o.prev?.impressions ?? 0) : null} label={o.end ? "vs the 28 days before" : "No data yet"} />
        </StatCard>
        <StatCard label="CTR" value={ctr(o.cur?.clicks ?? 0, o.cur?.impressions ?? 0)}>
          {o.end && o.prev?.impressions ? (
            <Change current={((o.cur.clicks || 0) / (o.cur.impressions || 1)) * 100} previous={(o.prev.clicks / o.prev.impressions) * 100} unit="pts" label="vs the 28 days before" />
          ) : (
            <Change current={0} previous={null} label="Clicks out of impressions" />
          )}
        </StatCard>
        <StatCard label="Average position" value={pos(o.cur?.position ?? null)}>
          {o.cur?.position != null && o.prev?.position != null ? (
            <Change current={o.cur.position} previous={o.prev.position} unit="pts" invert label="lower is better" />
          ) : (
            <Change current={0} previous={null} label="Impression-weighted" />
          )}
        </StatCard>
        <StatCard label="Health score" value={o.health == null ? "–" : `${o.health}/100`}>
          <Change current={0} previous={null} label={`${o.crawled}/${o.pages} sitemap pages crawled`} />
        </StatCard>
      </section>

      {o.series.length > 0 && (
        <div className="adm-grid-2">
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Clicks per day</h2>
              <span>Google · to {o.end}</span>
            </div>
            <DailyBars days={o.series.map((d) => ({ day: d.day, count: d.clicks }))} unit={["click", "clicks"]} />
          </section>
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Impressions per day</h2>
              <span>Google · to {o.end}</span>
            </div>
            <DailyBars days={o.series.map((d) => ({ day: d.day, count: d.impressions }))} unit={["impression", "impressions"]} />
          </section>
        </div>
      )}

      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Index status</h2>
            <span>
              URL Inspection · {o.inspected}/{o.pages} checked
            </span>
          </div>
          {notIndexed.length > 0 && (
            <p className="seo-actions seo-small">
              <CopyUrls urls={notIndexed.map((r) => r.url)} />
              <Link href="?tab=opportunities&kind=not_indexed">See the list →</Link>
            </p>
          )}
          {o.pages ? <BarList rows={Object.entries(o.index).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} total={o.pages} /> : <EmptyState icon="search" title="No pages yet" text="The first sync reads the sitemap." compact />}
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Work queue</h2>
            <span>
              <Link href="?tab=fixes">All fixes →</Link>
            </span>
          </div>
          <div className="adm-events">
            <div className="adm-event">
              <span>Open issues</span>
              <strong>{issues}</strong>
              <span className="adm-muted">
                {o.issues.error ?? 0} errors · {o.issues.warning ?? 0} warnings
              </span>
            </div>
            <div className="adm-event">
              <span>Opportunities</span>
              <strong>{oppTotal}</strong>
            </div>
            <div className="adm-event">
              <span>Waiting for approval</span>
              <strong>{o.fixes.waiting ?? 0}</strong>
            </div>
            <div className="adm-event">
              <span>Queued for the autopilot</span>
              <strong>{(o.fixes.auto ?? 0) + (o.fixes.queued ?? 0)}</strong>
            </div>
            <div className="adm-event">
              <span>Fixes done</span>
              <strong>{o.fixes.done ?? 0}</strong>
              <span className="adm-muted">of {fixTotal}</span>
            </div>
            <div className="adm-event">
              <span>New keyword ideas</span>
              <strong>{o.keywords_new}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Core Web Vitals by template</h2>
          <span>PageSpeed Insights, mobile · real users (CrUX) when Google has enough data</span>
        </div>
        {o.cwv.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Template</th>
                  <th scope="col">Lighthouse</th>
                  <th scope="col">Lab LCP</th>
                  <th scope="col">Lab TBT</th>
                  <th scope="col">Lab CLS</th>
                  <th scope="col">Real users</th>
                  <th scope="col">Measured</th>
                </tr>
              </thead>
              <tbody>
                {o.cwv.map((c) => (
                  <tr key={c.template}>
                    <td>
                      <strong>{TEMPLATE_LABELS[c.template as Template] ?? c.template}</strong>
                      <PageLink path={c.url} />
                    </td>
                    <td>{c.performance ?? "–"}</td>
                    <td>{c.lab_lcp_ms != null ? `${(c.lab_lcp_ms / 1000).toFixed(1)} s` : "–"}</td>
                    <td>{c.lab_tbt_ms != null ? `${c.lab_tbt_ms} ms` : "–"}</td>
                    <td>{c.lab_cls ?? "–"}</td>
                    <td>
                      {c.field_category ? (
                        <>
                          {c.field_category} <span className="adm-muted">({c.field_source})</span>
                          <br />
                          <small className="adm-muted">
                            LCP {c.field_lcp_ms ?? "–"} ms · INP {c.field_inp_ms ?? "–"} ms · CLS {c.field_cls ?? "–"}
                          </small>
                        </>
                      ) : (
                        <span className="adm-muted">Not enough Chrome data yet</span>
                      )}
                    </td>
                    <td className="adm-muted">{c.day}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="chart" title="Not measured yet" text="One template is measured per hourly sync until all six are done each day." compact />
        )}
      </section>

      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Sitemaps</h2>
            <span>Search Console</span>
          </div>
          {o.sitemaps.length ? (
            <ul className="seo-list">
              {o.sitemaps.map((m) => (
                <li key={m.path}>
                  <strong>{m.path}</strong>
                  <span className="adm-muted">
                    {m.submitted} URLs submitted · {m.errors} errors · {m.warnings} warnings · read by Google {m.last_downloaded ? formatDate(m.last_downloaded) : "not yet"}
                    {m.is_pending ? " · pending" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-muted">No sitemap data yet (needs Search Console).</p>
          )}
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Sync</h2>
            <span>Every hour (pg_cron)</span>
          </div>
          <ul className="seo-list">
            <li>
              <strong>Last run</strong>
              <span className="adm-muted">{s.last_run_at ? formatDate(s.last_run_at) : "never"}</span>
            </li>
            {Object.entries(s.last_run ?? {}).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>
                <span className={typeof v === "string" && v.startsWith("error") ? "adm-error" : "adm-muted"}>{typeof v === "string" ? v : JSON.stringify(v)}</span>
              </li>
            ))}
            <li>
              <strong>Search Console data</strong>
              <span className="adm-muted">
                {o.first_day ? `${o.first_day} to ${o.end}` : "none yet"}
                {s.gsc_backfill_done ? "" : s.gsc_synced_at ? " · 16-month backfill running" : ""}
              </span>
            </li>
            <li>
              <strong>Bing</strong>
              <span className="adm-muted">{s.bing_synced_at ? `${o.bing.clicks} clicks, ${o.bing.impressions} impressions (28 days)` : "BING_WEBMASTER_API_KEY not set"}</span>
            </li>
          </ul>
          <p className="adm-muted seo-small">
            Health score: average over crawled sitemap pages of 100 − 25 per open error − 8 per warning − 2 per notice (our own rule, from the Issues tab).
          </p>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Opportunities

async function Opportunities({ sp }: { sp: Search }) {
  const kind = one(sp.kind) || "striking";
  const page = pageOf(sp);
  const db = await ownerDb();
  const { data, error, count } = await db
    .from("seo_opportunities")
    .select("id, kind, query, page, score, data, fix_key", { count: "exact" })
    .eq("kind", kind)
    .order("score", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="opportunities" message={error.message} />;
  const rows = (data ?? []) as OpportunityRow[];
  const keys = rows.map((r) => r.fix_key).filter(Boolean) as string[];
  const fixes = keys.length ? (((await db.from("seo_fixes").select("key, status").in("key", keys)).data ?? []) as { key: string; status: string }[]) : [];
  const fixStatus = new Map(fixes.map((f) => [f.key, f.status]));
  const help = OPP_KINDS.find((k) => k[0] === kind)?.[2];
  const d = (r: OpportunityRow, k: string) => r.data[k] as number | string | null | undefined;
  return (
    <>
      <Filters tab="opportunities" name="kind" value={kind} options={OPP_KINDS} />
      {kind === "not_indexed" && page === 0 && <Unindexed />}
      <section className="adm-card">
        <p className="adm-muted seo-small">{help} Recomputed daily from the last 28 days of Search Console data.</p>
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  {kind !== "low_ctr" && kind !== "not_indexed" && kind !== "losing" && <th scope="col">Query</th>}
                  <th scope="col">Page</th>
                  <th scope="col">Data</th>
                  <th scope="col">Fix</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {kind !== "low_ctr" && kind !== "not_indexed" && kind !== "losing" && (
                      <td>
                        <strong>{r.query}</strong>
                      </td>
                    )}
                    <td>
                      <PageLink path={r.page} />
                    </td>
                    <td className="seo-data">
                      {kind === "striking" && `Position ${d(r, "position")} · ${n(d(r, "impressions") as number)} impressions · ${n(d(r, "clicks") as number)} clicks${d(r, "answered") ? " · already answered on the page" : ""}`}
                      {kind === "low_ctr" &&
                        `${n(d(r, "impressions") as number)} impressions · CTR ${Math.round((d(r, "ctr") as number) * 1000) / 10}%${d(r, "expected") != null ? ` vs site ${Math.round((d(r, "expected") as number) * 1000) / 10}%` : ""} · position ${d(r, "position")}`}
                      {kind === "missing_page" && `${n(d(r, "impressions") as number)} impressions · position ${d(r, "position") ?? "–"}${d(r, "cluster") ? ` · cluster ${d(r, "cluster")}` : ""}`}
                      {kind === "cannibal" &&
                        ((r.data.pages as { page: string; impressions: number; position: number }[]) ?? []).map((p) => (
                          <span key={p.page} className="seo-block">
                            {p.page}: {p.impressions} impr., pos. {p.position}
                          </span>
                        ))}
                      {kind === "not_indexed" && `${d(r, "state")}${d(r, "young") ? " · new post, give it time" : ""}${d(r, "lastCrawl") ? ` · last crawl ${String(d(r, "lastCrawl")).slice(0, 10)}` : ""}`}
                      {kind === "losing" && `${d(r, "before")} → ${d(r, "after")} clicks · position ${d(r, "positionBefore") ?? "–"} → ${d(r, "positionAfter") ?? "–"}`}
                    </td>
                    <td>{r.fix_key ? <Link href={href({ tab: "fixes", status: fixStatus.get(r.fix_key) ?? "auto" })}>{FIX_STATUS_LABEL[fixStatus.get(r.fix_key) ?? ""] ?? "–"}</Link> : <span className="adm-muted">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="search" title="Nothing here right now" text="Either there's no problem of this kind, or there's no Search Console data yet." compact />
        )}
        <Pager params={{ tab: "opportunities", kind }} page={page} total={count ?? 0} />
      </section>
    </>
  );
}

// ---------------------------------------------------------------- Fixes

const BeforeAfter = ({ f }: { f: FixRow }) => {
  if (f.status !== "done" || !f.baseline) return null;
  const a = f.after;
  return (
    <p className="seo-ba">
      <strong>Before → after</strong> (28 days each{a && !a.complete ? `, ${a.from} to ${a.to} so far` : ""}): clicks {f.baseline.clicks} → {a ? a.clicks : "…"}, impressions {f.baseline.impressions} →{" "}
      {a ? a.impressions : "…"}, position {f.baseline.position ?? "–"} → {a ? (a.position ?? "–") : "…"}
    </p>
  );
};

async function Fixes({ sp }: { sp: Search }) {
  const status = one(sp.status) || "waiting";
  const page = pageOf(sp);
  const db = await ownerDb();
  const { data, error, count } = await db
    .from("seo_fixes")
    .select("id, key, type, risk, page, title, change, reason, status, created_at, done_at, commit, note, attempts, baseline, after", { count: "exact" })
    .eq("status", status)
    .order(status === "done" ? "done_at" : "created_at", { ascending: status !== "done" })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="fixes" message={error.message} />;
  const rows = (data ?? []) as FixRow[];
  return (
    <>
      <Filters tab="fixes" name="status" value={status} options={FIX_STATUSES} />
      <section className="adm-card">
        <p className="adm-muted seo-small">
          Safe fixes (blog posts, backlog) are applied by the daily SEO autopilot session without you. Risky ones (redirects, merges, service/home/industry copy, code, sitemap, robots) wait here for one click.
        </p>
        {rows.length ? (
          <ul className="seo-fixes">
            {rows.map((f) => (
              <li key={f.id} className="seo-fix">
                <div className="seo-fix-head">
                  <span className={`adm-badge ${f.risk === "safe" ? "is-won" : "is-new"}`}>{f.risk === "safe" ? "Safe" : "Needs approval"}</span>
                  <strong>{f.title}</strong>
                  <FixButtons id={f.id} status={f.status} />
                </div>
                {f.page && <PageLink path={f.page} />}
                <p>
                  <span className="seo-k">Change:</span> {f.change}
                </p>
                <p className="adm-muted">
                  <span className="seo-k">Why:</span> {f.reason}
                </p>
                <p className="adm-muted seo-small">
                  {f.type} · created {formatDate(f.created_at, false)}
                  {f.done_at ? ` · done ${formatDate(f.done_at, false)}` : ""}
                  {f.commit ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={`https://github.com/HamzaTariq-Devrex/hamzatariq-site/commit/${f.commit}`} target="_blank" rel="noreferrer">
                        {f.commit.slice(0, 7)}
                      </a>
                    </>
                  ) : null}
                  {f.attempts ? ` · ${f.attempts} failed attempt(s)` : ""}
                  {f.note ? ` · ${f.note}` : ""}
                </p>
                <BeforeAfter f={f} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="chart" title={`No fixes ${FIX_STATUS_LABEL[status]?.toLowerCase() ?? status}`} text="Fixes are created by the daily analysis from issues and opportunities." compact />
        )}
        <Pager params={{ tab: "fixes", status }} page={page} total={count ?? 0} />
      </section>
    </>
  );
}

// ---------------------------------------------------------------- Pages and queries

async function Pages({ sp }: { sp: Search }) {
  const q = one(sp.q);
  const sort = one(sp.sort) || "clicks";
  const page = pageOf(sp);
  let res;
  try {
    res = await getSeoPages(page * PAGE_SIZE, PAGE_SIZE, q, sort);
  } catch (e) {
    return <Failed what="pages" message={(e as Error).message} />;
  }
  return (
    <section className="adm-card">
      <SearchForm tab="pages" q={q} sort={sort} sorts={[["clicks", "Most clicks"], ["position", "Best position"], ["issues", "Most issues"], ["path", "URL"]]} />
      {res.rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Clicks</th>
                <th scope="col">Impr.</th>
                <th scope="col">Position</th>
                <th scope="col">Index</th>
                <th scope="col">Issues</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((r) => (
                <tr key={r.path}>
                  <td>
                    <PageLink path={r.path} />
                    <small className="adm-muted seo-block">
                      {TEMPLATE_LABELS[r.template as Template] ?? r.template}
                      {r.status && r.status !== 200 ? ` · HTTP ${r.status}` : ""}
                      {r.response_ms ? ` · ${r.response_ms} ms` : ""}
                    </small>
                  </td>
                  <td>{n(r.clicks)}</td>
                  <td>{n(r.impressions)}</td>
                  <td>{r.position ?? "–"}</td>
                  <td className={r.index_verdict && r.index_verdict !== "PASS" ? "seo-warn" : ""}>{r.coverage_state ?? <span className="adm-muted">Not inspected</span>}</td>
                  <td>{r.issues ? <Link href={href({ tab: "issues", q: r.path })}>{r.errors ? `${r.errors} errors, ` : ""}{r.issues} total</Link> : r.crawled_at ? "0" : <span className="adm-muted">Not crawled</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="search" title="No pages" text="The first sync reads the sitemap and crawls every URL." compact />
      )}
      <Pager params={{ tab: "pages", q, sort }} page={page} total={res.total} />
    </section>
  );
}

async function Queries({ sp }: { sp: Search }) {
  const q = one(sp.q);
  const sort = one(sp.sort) || "impressions";
  const page = pageOf(sp);
  let res;
  try {
    res = await getSeoQueries(page * PAGE_SIZE, PAGE_SIZE, q, sort);
  } catch (e) {
    return <Failed what="queries" message={(e as Error).message} />;
  }
  return (
    <section className="adm-card">
      <SearchForm tab="queries" q={q} sort={sort} sorts={[["impressions", "Most impressions"], ["clicks", "Most clicks"], ["position", "Best position"]]} />
      {res.rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Query</th>
                <th scope="col">Page</th>
                <th scope="col">Clicks</th>
                <th scope="col">Impr.</th>
                <th scope="col">CTR</th>
                <th scope="col">Position (trend)</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((r) => (
                <tr key={r.query}>
                  <td>
                    <strong>{r.query}</strong>
                  </td>
                  <td>
                    <PageLink path={r.page} />
                  </td>
                  <td>{n(r.clicks)}</td>
                  <td>{n(r.impressions)}</td>
                  <td>{r.ctr != null ? `${r.ctr}%` : "–"}</td>
                  <td>
                    {r.position ?? "–"}
                    {r.prev_position != null && r.position != null && r.prev_position !== r.position && (
                      <small className={r.position < r.prev_position ? "seo-up" : "seo-down"}> {r.position < r.prev_position ? "↑" : "↓"} from {r.prev_position}</small>
                    )}
                    {r.prev_position == null && <small className="adm-muted"> new</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="search" title="No queries yet" text="Queries from Search Console show up after the first sync." compact />
      )}
      <Pager params={{ tab: "queries", q, sort }} page={page} total={res.total} />
    </section>
  );
}

// ---------------------------------------------------------------- Keywords and issues

async function Keywords({ sp }: { sp: Search }) {
  const status = one(sp.status) || "new";
  const page = pageOf(sp);
  const { data, error, count } = await (await ownerDb())
    .from("seo_keywords")
    .select("keyword, sources, intent, cluster, impressions, clicks, position, page, has_page, status, data, first_seen", { count: "exact" })
    .eq("status", status)
    .order("impressions", { ascending: false })
    .order("keyword")
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="keyword ideas" message={error.message} />;
  const rows = (data ?? []) as KeywordRow[];
  return (
    <>
      <Filters tab="keywords" name="status" value={status} options={[["new", "New ideas"], ["approved", "Added to backlog"], ["dismissed", "Dismissed"]]} />
      <section className="adm-card">
        <p className="adm-muted seo-small">From your own Search Console queries, Bing queries and Bing related keywords for each cluster&apos;s pillar. &quot;Add to backlog&quot; queues it for the SEO autopilot, which writes the topic into content/backlog.json; the blog autopilot then writes it at its normal pace.</p>
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Keyword</th>
                  <th scope="col">Data</th>
                  <th scope="col">Page</th>
                  {status === "new" && <th scope="col">Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => (
                  <tr key={k.keyword}>
                    <td>
                      <strong>{k.keyword}</strong>
                      <small className="adm-muted seo-block">
                        {k.intent} · {k.cluster ?? "no cluster"} · {k.sources.join(", ")}
                      </small>
                    </td>
                    <td className="seo-data">
                      {k.impressions ? `Google: ${k.impressions} impr., ${k.clicks} clicks, pos. ${k.position ?? "–"}` : ""}
                      {k.data.bingImpressions ? <span className="seo-block">Bing: {String(k.data.bingImpressions)} impr.</span> : null}
                      {k.data.bingRelatedImpressions ? <span className="seo-block">Bing related: {String(k.data.bingRelatedImpressions)} impr.</span> : null}
                    </td>
                    <td>
                      {k.has_page ? (
                        <>
                          <span className="adm-muted">Has a page: </span>
                          <PageLink path={(k.data.target as string) ?? k.page} />
                        </>
                      ) : k.data.planned ? (
                        <span className="adm-muted">Planned: {String(k.data.planned)}</span>
                      ) : (
                        <span className="seo-warn">No page yet</span>
                      )}
                    </td>
                    {status === "new" && (
                      <td>
                        <KeywordButtons keyword={k.keyword} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="search" title="No keyword ideas here" text="Ideas come from real search data, so they start once Search Console (or Bing) is connected." compact />
        )}
        <Pager params={{ tab: "keywords", status }} page={page} total={count ?? 0} />
      </section>
    </>
  );
}

async function Issues({ sp }: { sp: Search }) {
  const severity = one(sp.severity) || "all";
  const q = one(sp.q);
  const page = pageOf(sp);
  const db = await ownerDb();
  let query = db.from("seo_issues").select("path, type, severity, detail, first_seen, last_seen, resolved_at, fix_key", { count: "exact" });
  query = severity === "resolved" ? query.not("resolved_at", "is", null) : query.is("resolved_at", null);
  if (severity !== "all" && severity !== "resolved") query = query.eq("severity", severity);
  if (q) query = query.ilike("path", `%${q}%`);
  const { data, error, count } = await query.order(severity === "resolved" ? "resolved_at" : "severity").order("path").range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="issues" message={error.message} />;
  const rows = (data ?? []) as IssueRow[];
  const keys = rows.map((r) => r.fix_key).filter(Boolean) as string[];
  const fixes = keys.length ? (((await db.from("seo_fixes").select("key, status").in("key", keys)).data ?? []) as { key: string; status: string }[]) : [];
  const fixStatus = new Map(fixes.map((f) => [f.key, f.status]));
  return (
    <>
      <Filters tab="issues" name="severity" value={severity} options={[["all", "All open"], ["error", "Errors"], ["warning", "Warnings"], ["notice", "Notices"], ["resolved", "Resolved"]]} />
      <section className="adm-card">
        <p className="adm-muted seo-small">From our own crawl of every sitemap URL (raw HTML, like a crawler), link checks and PageSpeed. Rules: title under 60 characters, description 150–160, one H1, canonical, OG, JSON-LD, alt text, no orphan or thin pages.</p>
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Issue</th>
                  <th scope="col">Fix status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.path}:${r.type}`}>
                    <td>
                      <PageLink path={r.path} />
                    </td>
                    <td>
                      <span className={`seo-sev is-${r.severity}`}>{r.severity}</span> {r.detail}
                      <small className="adm-muted seo-block">
                        {r.type} · since {formatDate(r.first_seen, false)}
                        {r.resolved_at ? ` · resolved ${formatDate(r.resolved_at, false)}` : ""}
                      </small>
                    </td>
                    <td>{r.fix_key && fixStatus.get(r.fix_key) ? <Link href={href({ tab: "fixes", status: fixStatus.get(r.fix_key) })}>{FIX_STATUS_LABEL[fixStatus.get(r.fix_key)!]}</Link> : <span className="adm-muted">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="search" title="No issues here" text="The crawl runs every day; problems it finds show up here." compact />
        )}
        <Pager params={{ tab: "issues", severity, q }} page={page} total={count ?? 0} />
      </section>
    </>
  );
}

// ---------------------------------------------------------------- Page

export default async function SeoPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tab = (TABS.some(([k]) => k === one(sp.tab)) ? one(sp.tab) : "overview") as Tab;
  const body: Record<Tab, React.ReactNode> = {
    overview: <Overview />,
    opportunities: <Opportunities sp={sp} />,
    fixes: <Fixes sp={sp} />,
    pages: <Pages sp={sp} />,
    queries: <Queries sp={sp} />,
    keywords: <Keywords sp={sp} />,
    issues: <Issues sp={sp} />,
  };
  return (
    <main className="adm-page">
      <PageHead title="SEO" text="Search Console, Bing, our own crawl and PageSpeed · real data only">
        <SyncButton />
      </PageHead>
      <nav className="ox-tabs" aria-label="SEO">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`?tab=${key}`} className={key === tab ? "is-active" : ""} aria-current={key === tab ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <Suspense key={JSON.stringify(sp)} fallback={tab === "overview" ? <SkeletonStats /> : <SkeletonCard rows={10} />}>
        {body[tab]}
      </Suspense>
    </main>
  );
}
