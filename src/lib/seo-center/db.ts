// Server-only access to the SEO tables through the app_seo_* functions (anon key + server secret),
// for the sync job, the fix-queue API and /admin/seo (after the owner check).
import { rpcClient, serverSecret } from "@/lib/supabase/server";

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export const seoRpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  const client = rpcClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { data, error } = await (client.rpc as unknown as Rpc).call(client, fn, { p_secret: serverSecret(), ...args });
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
};

export type SeoState = {
  gsc_synced_at: string | null;
  gsc_backfill_before: string | null;
  gsc_backfill_done: boolean;
  sitemaps_synced_at: string | null;
  bing_synced_at: string | null;
  cwv_synced_at: string | null;
  crawl_list_at: string | null;
  analysed_at: string | null;
  weekly_sent_on: string | null;
  last_run_at: string | null;
  last_run: Record<string, unknown> | null;
};

export type PageRow = {
  path: string;
  template: string;
  in_sitemap: boolean;
  crawled_at: string | null;
  status: number | null;
  redirect_to: string | null;
  response_ms: number | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  has_og: boolean | null;
  has_jsonld: boolean | null;
  noindex: boolean | null;
  h1_count: number | null;
  words: number | null;
  images_missing_alt: number | null;
  links_out: string[];
  external_links: string[];
  inspected_at: string | null;
  index_verdict: string | null;
  coverage_state: string | null;
  robots_state: string | null;
  indexing_state: string | null;
  page_fetch_state: string | null;
  google_canonical: string | null;
  last_google_crawl: string | null;
};

export type CwvRow = {
  template: string;
  day: string;
  url: string;
  performance: number | null;
  lab_lcp_ms: number | null;
  lab_cls: number | null;
  lab_tbt_ms: number | null;
  field_lcp_ms: number | null;
  field_inp_ms: number | null;
  field_cls: number | null;
  field_category: string | null;
  field_source: string | null;
};

export type LinkRow ={ url: string; status: number | null; error: string | null; checked_at: string | null; found_on: string[] };
export type AggRow = { page: string; query: string; clicks: number; impressions: number; position: number | null };

export type SearchRow = { engine: "google" | "bing"; day: string; page: string; query: string; clicks: number; impressions: number; position: number | null };

export const db = {
  state: () => seoRpc<SeoState>("app_seo_state"),
  setState: (patch: Partial<SeoState>) => seoRpc<void>("app_seo_set_state", { p_patch: patch }),
  upsertSearch: async (rows: SearchRow[]) => {
    let n = 0;
    for (let i = 0; i < rows.length; i += 2000) n += await seoRpc<number>("app_seo_upsert_search", { p_rows: rows.slice(i, i + 2000) });
    return n;
  },
  setSitemapPaths: (rows: { path: string; template: string }[]) => seoRpc<void>("app_seo_set_sitemap_paths", { p_rows: rows }),
  pagesDue: (kind: "crawl" | "inspect", olderThanHours: number, limit: number) =>
    seoRpc<string[]>("app_seo_pages_due", { p_kind: kind, p_older_than_hours: olderThanHours, p_limit: limit }),
  saveCrawl: (rows: Record<string, unknown>[]) => seoRpc<void>("app_seo_save_crawl", { p_rows: rows }),
  saveInspection: (rows: Record<string, unknown>[]) => seoRpc<void>("app_seo_save_inspection", { p_rows: rows }),
  allPages: () => seoRpc<PageRow[]>("app_seo_all_pages"),
  registerLinks: (rows: { url: string; found_on: string[] }[]) => seoRpc<void>("app_seo_register_links", { p_rows: rows }),
  linksDue: (limit: number) => seoRpc<string[]>("app_seo_links_due", { p_limit: limit }),
  saveLinks: (rows: { url: string; status: number | null; error: string | null }[]) => seoRpc<void>("app_seo_save_links", { p_rows: rows }),
  allLinks: () => seoRpc<LinkRow[]>("app_seo_all_links"),
  saveCwv: (row: Record<string, unknown>) => seoRpc<void>("app_seo_save_cwv", { p_row: row }),
  cwvMeasuredToday: () => seoRpc<string[]>("app_seo_cwv_measured_today"),
  cwvLatest: () => seoRpc<CwvRow[]>("app_seo_cwv_latest"),
  saveSitemaps: (rows: Record<string, unknown>[]) => seoRpc<void>("app_seo_save_sitemaps", { p_rows: rows }),
  agg: (engine: "google" | "bing", kind: "total" | "page" | "query" | "pair", from: string, to: string) =>
    seoRpc<AggRow[]>("app_seo_agg", { p_engine: engine, p_kind: kind, p_from: from, p_to: to }),
  latestDay: (engine: "google" | "bing") => seoRpc<string | null>("app_seo_latest_day", { p_engine: engine }),
  replaceOpportunities: (rows: Record<string, unknown>[]) => seoRpc<void>("app_seo_replace_opportunities", { p_rows: rows }),
  replaceIssues: (rows: Record<string, unknown>[]) => seoRpc<void>("app_seo_replace_issues", { p_rows: rows }),
  upsertKeywords: (rows: Record<string, unknown>[]) => seoRpc<void>("app_seo_upsert_keywords", { p_rows: rows }),
  addFixes: (rows: Record<string, unknown>[]) => seoRpc<number>("app_seo_add_fixes", { p_rows: rows }),
  trackFixes: () => seoRpc<number>("app_seo_track_fixes"),
  fixQueue: (limit: number) => seoRpc<unknown[]>("app_seo_fix_queue", { p_limit: limit }),
  markFix: (id: string, status: "done" | "failed", commit: string | null, note: string | null) =>
    seoRpc<unknown>("app_seo_fix_mark", { p_id: id, p_status: status, p_commit: commit, p_note: note }),
  weekly: () => seoRpc<Weekly>("app_seo_weekly"),
};

export type Weekly = {
  end: string | null;
  cur: { clicks: number; impressions: number };
  prev: { clicks: number; impressions: number };
  gained: { query: string; dc: number; di: number; cur_clicks: number; cur_impr: number }[];
  lost: { query: string; dc: number; di: number; cur_clicks: number; cur_impr: number }[];
  done: { title: string; page: string | null; commit: string | null }[];
  waiting: { title: string; page: string | null }[];
  auto_queued: number;
  ideas: { keyword: string; impressions: number; cluster: string | null }[];
  open_issues: number;
};
