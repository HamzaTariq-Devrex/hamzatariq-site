// Server-only access to the outreach tables through the app_ox_* functions (anon key + server secret).
// Background jobs have no user session, so they can't use RLS; /admin uses the owner's session instead.
import type { Json } from "@/lib/supabase/database.types";
import { rpcClient, serverSecret } from "@/lib/supabase/server";
import type { AuditResult } from "@/lib/audit/types";

export const COUNTRIES = { US: "United States", GB: "United Kingdom", AE: "United Arab Emirates", CA: "Canada", AU: "Australia" } as const;
export type Country = keyof typeof COUNTRIES;

export type Settings = {
  paused: boolean;
  pause_reason: string | null;
  approve_first: boolean;
  started_at: string | null;
  next_send_at: string | null;
  last_imap_at: string | null;
  last_imap_uid: number | null;
};

export type Search = {
  id: string;
  business_type: string;
  city: string;
  country: Country;
  active: boolean;
  lat: number | null;
  lon: number | null;
  osm_area: number | null;
  timezone: string | null;
  last_run_at: string | null;
};

export type Prospect = {
  id: string;
  search_id: string | null;
  osm_id: string;
  name: string;
  business_type: string;
  city: string | null;
  country: Country;
  timezone: string;
  website: string | null;
  domain: string | null;
  phone: string | null;
  email: string | null;
  email_source: "osm" | "contact-page" | null;
  osm_tags: Record<string, string>;
  status: string;
  audit_score: number | null;
  lead_score: number | null;
  unsubscribe_token: string;
  instagram?: string | null;
  reply_class?: string | null;
  snooze_until?: string | null;
  next_followup_at?: string | null;
};

export type ProspectAudit = { id: string; report_id: string; url: string; final_url: string | null; score: number | null; result: AuditResult | null; expires_at: string };

export type Message = {
  id: string;
  prospect_id: string;
  step: number | null;
  status: string;
  subject: string;
  body: string;
  message_id: string | null;
};

export type ThreadItem = { direction: string; kind: string; step: number | null; status: string; subject: string; body: string; message_id: string | null; sent_at: string | null; created_at: string };

export type State = {
  settings: Settings;
  searches: Search[];
  sent_24h: number;
  sent_7d: number;
  bounces_7d: number;
  complaints_7d: number;
  /** Bounce guard: the last 50 emails since outreach was last resumed. */
  last50_sent: number;
  last50_bounces: number;
  found_24h: number;
};

const db = () => {
  const client = rpcClient();
  if (!client) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVER_SECRET).");
  return client;
};

// The generated types don't know the jsonb shapes, so results are cast here, in one place.
const call = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await (db().rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, {
    p_secret: serverSecret(),
    ...args,
  });
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
};

const json = (v: unknown) => v as Json;

export const ox = {
  state: () => call<State>("app_ox_state", {}),
  set: (patch: Partial<Settings>) => call<void>("app_ox_set", { p_patch: json(patch) }),
  search: (id: string) => call<Search | null>("app_ox_search", { p_id: id }),
  searchRan: (id: string, patch: Partial<Search> & { last_found?: number }) => call<void>("app_ox_search_ran", { p_id: id, p_patch: json(patch) }),
  cacheGet: <T>(key: string, hours: number) => call<T | null>("app_ox_cache_get", { p_key: key, p_hours: hours }),
  cachePut: (key: string, value: unknown) => call<void>("app_ox_cache_put", { p_key: key, p_value: json(value) }),
  addProspect: (row: Record<string, unknown>) => call<string | null>("app_ox_add_prospect", { p_row: json(row) }),
  toAudit: (limit: number) => call<Prospect[]>("app_ox_list", { p_kind: "to_audit", p_limit: limit }),
  toDraft: (limit: number) => call<(Prospect & { audit: ProspectAudit | null })[]>("app_ox_list", { p_kind: "to_draft", p_limit: limit }),
  followups: (limit: number) => call<{ prospect: Prospect; first: Message; next_step: number; audit: ProspectAudit | null }[]>("app_ox_list", { p_kind: "followups", p_limit: limit }),
  approved: (limit: number) =>
    call<{ message: Message; prospect: Prospect; thread: { message_id: string; subject: string } | null }[]>("app_ox_list", { p_kind: "approved", p_limit: limit }),
  checkbacks: (limit: number) => call<{ prospect: Prospect; first: Message | null }[]>("app_ox_list", { p_kind: "checkbacks", p_limit: limit }),
  domainEmailed: (email: string, exclude: string) => call<boolean>("app_ox_domain_emailed", { p_email: email, p_exclude: exclude }),
  /** One prospect with its latest audit and email thread (sent and received messages). */
  detail: (id: string) =>
    call<{ prospect: Prospect; audit: ProspectAudit | null; thread: ThreadItem[] } | null>("app_ox_prospect", { p_id: id }),
  prospect: async (id: string) => (await ox.detail(id))?.prospect ?? null,
  latestAudit: async (id: string) => (await ox.detail(id))?.audit ?? null,
  thread: async (id: string) => (await ox.detail(id))?.thread ?? [],
  sentIds: () => call<{ message_id: string; prospect_id: string; email: string; name: string }[]>("app_ox_list", { p_kind: "sent_ids", p_limit: 0 }),
  updateProspect: (id: string, patch: Record<string, unknown>) => call<void>("app_ox_update_prospect", { p_id: id, p_patch: json(patch) }),
  saveAudit: (prospect: string, url: string, finalUrl: string | null, score: number | null, result: unknown) =>
    call<string>("app_ox_save_audit", { p_prospect: prospect, p_url: url, p_final_url: finalUrl, p_score: score, p_result: json(result) }),
  addMessage: (row: Record<string, unknown>) => call<string>("app_ox_add_message", { p_row: json(row) }),
  updateMessage: (id: string, patch: Record<string, unknown>) => call<void>("app_ox_update_message", { p_id: id, p_patch: json(patch) }),
  stop: (email: string, reason: "unsubscribed" | "bounced" | "complaint" | "replied", prospect: string | null = null) =>
    call<void>("app_ox_stop", { p_email: email, p_reason: reason, p_prospect: prospect }),
  isSuppressed: (email: string, exclude: string | null = null) => call<boolean>("app_ox_is_suppressed", { p_email: email, p_exclude: exclude }),
  report: (reportId: string) =>
    call<{ name: string; business_type: string; city: string | null; url: string; final_url: string | null; score: number | null; result: AuditResult | null; created_at: string; expires_at: string; expired: boolean } | null>(
      "app_ox_report",
      { p_report: reportId },
    ),
  deleteDraft: (id: string) => call<string | null>("app_ox_delete_draft", { p_id: id }),
  messageForTest: (id: string) => call<{ subject: string; body: string } | null>("app_ox_message_for_test", { p_id: id }),
  unsubscribe: (token: string, confirm: boolean) => call<{ name: string; done: boolean } | null>("app_ox_unsubscribe", { p_token: token, p_confirm: confirm }),
};
