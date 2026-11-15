// Server-only data loaders for /admin. Each page gets its numbers from one SQL function
// (supabase/migrations/20261116120000_admin_speed.sql) instead of fetching rows and counting here.
// Callers check the owner first (the dashboard layout and every action do).
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { adminRpc, serverSecret } from "@/lib/supabase/server";

export type Overview = {
  leads_total: number;
  won_total: number;
  leads_30: number;
  won_30: number;
  leads_prev30: number;
  won_prev30: number;
  week: number;
  prev_week: number;
  chats_today: number;
  chats_yesterday: number;
  chats_week: number;
  chats_prev_week: number;
  per_day: { day: string; count: number }[];
  by_source: Record<string, number>;
  by_project_type: { project_type: string | null; count: number }[];
  events: Record<string, { cur: number; prev: number }>;
  tools: Record<string, number>;
  cta: Record<string, number>;
  outreach: { found: number; sent: number; replies: number; bounces: number; unsubscribes: number };
  latest: { id: string; name: string; project_type: string | null; source: string; status: string; created_at: string }[];
};

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const call = async <T>(fn: string, args: Record<string, unknown> = {}) => {
  const client = adminRpc();
  const { data, error } = await (client.rpc as unknown as Rpc).call(client, fn, { p_secret: serverSecret(), ...args });
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
};

export const OVERVIEW_TAG = "admin-overview";

/** Overview numbers, cached for 60 seconds ("Refresh" clears the cache) and shared within a request. */
export const getOverview = cache(unstable_cache(() => call<Overview>("app_admin_overview"), ["admin-overview-v1"], { revalidate: 60, tags: [OVERVIEW_TAG] }));

export type ChatStats = { total_chats: number; questions: number; off_topic: number; saved: number; personal: number; top: { text: string; count: number }[] };
export const getChatStats = (days: number, offTopic: string, smallTalk: string) =>
  call<ChatStats>("app_admin_chats", { p_days: days, p_off_topic: offTopic, p_small_talk: smallTalk });

export type ChatSessionRow = { id: string; created_at: string; first_page: string | null; message_count: number; first_question: string | null; lead_id: string | null };
export const getChatSessions = (offset: number, limit: number) => call<ChatSessionRow[]>("app_admin_chat_sessions", { p_offset: offset, p_limit: limit });

export type ProspectStats = {
  days: { day: string; found: number; emailed: number; replied: number; bounced: number; unsubscribed: number }[];
  by_status: Record<string, number>;
  total: number;
  sent_24h: number;
};
export const getProspectStats = (days: number) => call<ProspectStats>("app_admin_prospect_stats", { p_days: days });

/** Rows per page in admin lists ("Load more" fetches the next page). */
export const PAGE_SIZE = 50;
