// Data for /admin/seo (server-only; the dashboard layout checks the owner first). Overview, pages
// and queries come from one SQL function each; the other tabs read their table through the
// owner's session (RLS), 50 rows at a time.
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwner } from "@/lib/supabase/server";
import { seoRpc, type CwvRow, type SeoState } from "./db";

export type SeoOverview = {
  end: string | null;
  first_day: string | null;
  cur: { clicks: number; impressions: number; position: number | null };
  prev: { clicks: number; impressions: number; position: number | null };
  series: { day: string; clicks: number; impressions: number }[];
  bing: { clicks: number; impressions: number; rows: number };
  health: number | null;
  pages: number;
  crawled: number;
  inspected: number;
  index: Record<string, number>;
  issues: Record<string, number>;
  fixes: Record<string, number>;
  opportunities: Record<string, number>;
  keywords_new: number;
  cwv: CwvRow[];
  sitemaps: { path: string; last_submitted: string | null; last_downloaded: string | null; is_pending: boolean | null; errors: number; warnings: number; submitted: number; indexed: number | null; synced_at: string }[];
  state: SeoState;
};

export const getSeoOverview = cache(() => seoRpc<SeoOverview>("app_admin_seo_overview"));

export type SeoPageRow = {
  path: string;
  template: string;
  status: number | null;
  coverage_state: string | null;
  index_verdict: string | null;
  crawled_at: string | null;
  inspected_at: string | null;
  title: string | null;
  response_ms: number | null;
  clicks: number;
  impressions: number;
  position: number | null;
  issues: number;
  errors: number;
};
export const getSeoPages = (offset: number, limit: number, search: string, sort: string) =>
  seoRpc<{ total: number; rows: SeoPageRow[] }>("app_admin_seo_pages", { p_offset: offset, p_limit: limit, p_search: search, p_sort: sort });

export type SeoQueryRow = { query: string; clicks: number; impressions: number; position: number | null; ctr: number | null; prev_position: number | null; prev_clicks: number; page: string | null };
export const getSeoQueries = (offset: number, limit: number, search: string, sort: string) =>
  seoRpc<{ total: number; rows: SeoQueryRow[] }>("app_admin_seo_queries", { p_offset: offset, p_limit: limit, p_search: search, p_sort: sort });

/** The owner's client without generated types for the seo_* tables (they are read with plain selects). */
export const ownerDb = async () => (await getOwner())!.supabase as unknown as SupabaseClient;

export type OpportunityRow = { id: number; kind: string; query: string | null; page: string | null; score: number; data: Record<string, unknown>; fix_key: string | null };
export type IssueRow = { path: string; type: string; severity: string; detail: string; first_seen: string; last_seen: string; resolved_at: string | null; fix_key: string | null };
export type KeywordRow = { keyword: string; sources: string[]; intent: string | null; cluster: string | null; impressions: number; clicks: number; position: number | null; page: string | null; has_page: boolean; status: string; data: Record<string, unknown>; first_seen: string };
export type FixRow = {
  id: string;
  key: string;
  type: string;
  risk: "safe" | "risky";
  page: string | null;
  title: string;
  change: string;
  reason: string;
  status: string;
  created_at: string;
  done_at: string | null;
  commit: string | null;
  note: string | null;
  attempts: number;
  baseline: { clicks: number; impressions: number; position: number | null; from: string; to: string } | null;
  after: { clicks: number; impressions: number; position: number | null; from: string; to: string; complete: boolean } | null;
};
