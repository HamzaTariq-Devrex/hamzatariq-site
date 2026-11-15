"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { authClient, getOwner } from "@/lib/supabase/server";
import { STATUSES, SERVICE_GROUPS, pktDayStart, type LeadStatus, type ServiceKey } from "@/lib/admin/labels";
import type { Lead, LeadRow } from "@/components/admin/LeadsBrowser";
import { OVERVIEW_TAG, PAGE_SIZE, getChatSessions, type ChatSessionRow } from "@/lib/admin/data";

// Every action checks the owner again: server actions are public endpoints. RLS also limits
// updates to the owner and to the status and notes columns.

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const owner = await getOwner();
  if (!owner || !STATUSES.includes(status)) return { error: "Not allowed." };
  const { error } = await owner.supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  revalidateTag(OVERVIEW_TAG);
  return { error: null };
}

export async function updateLeadNotes(id: string, notes: string) {
  const owner = await getOwner();
  if (!owner) return { error: "Not allowed." };
  const { error } = await owner.supabase
    .from("leads")
    .update({ notes: notes.trim().slice(0, 4000) || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { error: null };
}

export type TranscriptMessage = { role: string; content: string; created_at: string };

export async function getTranscript(sessionId: string): Promise<TranscriptMessage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  const { data } = await owner.supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at")
    .order("id");
  return data ?? [];
}

/** "Refresh" on the overview: clears the 60-second cache of the numbers. */
export async function refreshOverview() {
  const owner = await getOwner();
  if (!owner) return;
  revalidateTag(OVERVIEW_TAG);
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------- /admin/leads: server-side filters, 50 rows per page ----------

export type LeadFilters = { q: string; status: string; service: string; source: string; from: string; to: string; newestFirst: boolean };

const SERVICE_TYPES: Record<Exclude<ServiceKey, "other">, string[]> = {
  websites: ["Next.js website", "Ecommerce store"],
  dashboards: ["Dashboard or web app"],
  chatbots: ["AI chatbot"],
  seo: ["React / Next.js SEO"],
};
const ALL_TYPES = Object.values(SERVICE_TYPES).flat();
const LIST_COLUMNS = "id, name, email, project_type, budget, source, status, created_at, audit:seo_audits(final_url, score)";
const quote = (v: string) => `"${v.replace(/"/g, '\\"')}"`;

type Owner = NonNullable<Awaited<ReturnType<typeof getOwner>>>;

/** Builds the filtered query (not awaited here: awaiting a query builder runs it). */
const filtered = (owner: Owner, f: LeadFilters, columns: string, count: boolean) => {
  let q = owner.supabase.from("leads").select(columns, count ? { count: "exact" } : undefined);
  if (f.status) q = q.eq("status", f.status);
  if (f.source) q = q.eq("source", f.source);
  if (f.service && SERVICE_GROUPS.some((g) => g.key === f.service)) {
    q = f.service === "other" ? q.or(`project_type.is.null,project_type.not.in.(${ALL_TYPES.map(quote).join(",")})`) : q.in("project_type", SERVICE_TYPES[f.service as Exclude<ServiceKey, "other">]);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.from)) q = q.gte("created_at", new Date(pktDayStart(f.from)).toISOString());
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.to)) q = q.lt("created_at", new Date(pktDayStart(f.to) + 86_400_000).toISOString());
  const term = f.q.trim().replace(/[%_,()*\\"]/g, " ").trim().slice(0, 100);
  if (term) q = q.or(["name", "email", "phone", "message", "notes", "project_type"].map((c) => `${c}.ilike.%${term}%`).join(","));
  return q.order("created_at", { ascending: !f.newestFirst });
};

/** One page of leads (list columns only) and the total that match the filters. */
export async function listLeads(f: LeadFilters, offset: number): Promise<{ rows: LeadRow[]; total: number; error: string | null }> {
  const owner = await getOwner();
  if (!owner) return { rows: [], total: 0, error: "Not allowed." };
  const { data, count, error } = await filtered(owner, f, LIST_COLUMNS, true).range(offset, offset + PAGE_SIZE - 1).overrideTypes<LeadRow[]>();
  return { rows: data ?? [], total: count ?? 0, error: error?.message ?? null };
}

/** Every lead that matches the filters, all columns, for the CSV export. */
export async function exportLeads(f: LeadFilters): Promise<Lead[]> {
  const owner = await getOwner();
  if (!owner) return [];
  const { data } = await filtered(owner, f, "*, audit:seo_audits(final_url, score)", false).limit(10000).overrideTypes<Lead[]>();
  return data ?? [];
}

/** The full lead, loaded when its side panel opens. */
export async function getLead(id: string): Promise<Lead | null> {
  const owner = await getOwner();
  if (!owner) return null;
  const { data } = await owner.supabase.from("leads").select("*, audit:seo_audits(final_url, score)").eq("id", id).maybeSingle().overrideTypes<Lead>();
  return data ?? null;
}
/** Next page of chat sessions (/admin/chats "Load more"). */
export async function loadChatSessions(offset: number): Promise<ChatSessionRow[]> {
  const owner = await getOwner();
  if (!owner) return [];
  return getChatSessions(Math.max(0, offset), PAGE_SIZE);
}