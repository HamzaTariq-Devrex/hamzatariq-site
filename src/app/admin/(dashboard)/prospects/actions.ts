"use server";

import { revalidatePath } from "next/cache";
import { getOwner } from "@/lib/supabase/server";
import { MANUAL_PROSPECT_STATUSES, type ProspectStatus } from "@/lib/admin/labels";
import { COUNTRIES, ox, type Country } from "@/lib/outreach/db";
import { isBusinessType } from "@/lib/outreach/osm";
import { discoverAll, draftNew, tick } from "@/lib/outreach/pipeline";
import { sendTestToOwner } from "@/lib/outreach/test-send";

// Owner-only actions for /admin/prospects. Each one checks the owner again (server actions are
// public endpoints); table writes also go through RLS and column grants.

type Result = { error: string | null; info?: string };
const done = (info?: string): Result => {
  revalidatePath("/admin/prospects");
  return { error: null, info };
};
const fail = (error: unknown): Result => ({ error: error instanceof Error ? error.message : String(error) });

export async function setPaused(paused: boolean): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const { error } = await owner.supabase
    .from("outreach_settings")
    .update({ paused, pause_reason: paused ? "Paused by hand" : null, updated_at: new Date().toISOString() })
    .eq("id", 1);
  return error ? fail(error.message) : done();
}

export async function setApproveFirst(approveFirst: boolean): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const { error } = await owner.supabase.from("outreach_settings").update({ approve_first: approveFirst, updated_at: new Date().toISOString() }).eq("id", 1);
  return error ? fail(error.message) : done();
}

export async function addSearch(businessType: string, city: string, country: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const name = city.trim().slice(0, 80);
  if (!isBusinessType(businessType) || !name || !(country in COUNTRIES)) return fail("Pick a business type, a city and a country.");
  if (country === "US") return fail("US searches are off until a postal address is added to the email footer.");
  const { error } = await owner.supabase.from("outreach_searches").insert({ business_type: businessType, city: name, country: country as Country });
  return error ? fail(error.message) : done();
}

export async function toggleSearch(id: string, active: boolean): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const { error } = await owner.supabase.from("outreach_searches").update({ active }).eq("id", id);
  return error ? fail(error.message) : done();
}

export async function deleteSearch(id: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const { error } = await owner.supabase.from("outreach_searches").delete().eq("id", id);
  return error ? fail(error.message) : done();
}

/** Runs one saved search now (OpenStreetMap only; nothing is audited or sent here). */
export async function runSearchNow(id: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  try {
    const [r] = await discoverAll(id);
    if (!r) return done("Daily limit of 30 new businesses reached, or the search is switched off.");
    return r.error ? fail(r.error) : done(`${r.added} new business${r.added === 1 ? "" : "es"} added.`);
  } catch (e) {
    return fail(e);
  }
}

/** Audits the next sites and writes drafts now. Never sends: the "send" phase is left out. */
export async function processNow(): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  try {
    const r = await tick(["audit", "draft"], 55_000);
    const audits = (r.audits as string[] | undefined)?.length ?? 0;
    return done(`${audits} audited, ${(r.drafts as number | undefined) ?? 0} drafted.`);
  } catch (e) {
    return fail(e);
  }
}

/** Approves the given drafts (the day's batch). */
export async function approveDrafts(ids: string[]): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  if (!ids.length) return done();
  const { error } = await owner.supabase
    .from("outreach_messages")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .in("id", ids.slice(0, 500))
    .eq("status", "draft");
  return error ? fail(error.message) : done(`${ids.length} approved.`);
}

export async function discardDraft(id: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const { error } = await owner.supabase.from("outreach_messages").update({ status: "cancelled" }).eq("id", id).in("status", ["draft", "approved"]);
  return error ? fail(error.message) : done();
}

export async function saveDraft(id: string, subject: string, body: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const s = subject.trim();
  const b = body.trim();
  if (!s || s.length >= 50 || !b) return fail("Subject must be under 50 characters, and the email can't be empty.");
  const { error } = await owner.supabase.from("outreach_messages").update({ subject: s, body: b.slice(0, 8000) }).eq("id", id).eq("status", "draft");
  return error ? fail(error.message) : done("Saved.");
}

/** Sends this draft to Hamza's own address only (the recipient is fixed in sendTestToOwner). */
export async function sendTest(id: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  try {
    await sendTestToOwner(id);
    return { error: null, info: "Test sent to your inbox." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProspectStatus(id: string, status: ProspectStatus): Promise<Result> {
  const owner = await getOwner();
  if (!owner || !MANUAL_PROSPECT_STATUSES.includes(status)) return fail("Not allowed.");
  const { data } = await owner.supabase.from("prospects").select("email").eq("id", id).single();
  // Unsubscribing by hand is permanent, like the link in the email.
  if (status === "unsubscribed" && data?.email) {
    try {
      await ox.stop(data.email, "unsubscribed", id);
    } catch (e) {
      return fail(e);
    }
    return done();
  }
  const { error } = await owner.supabase.from("prospects").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? fail(error.message) : done();
}

export async function updateProspectNotes(id: string, notes: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const { error } = await owner.supabase
    .from("prospects")
    .update({ notes: notes.trim().slice(0, 4000) || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  return error ? fail(error.message) : done();
}

/**
 * Gmail gives personal senders no complaint reports, so a complaint you notice yourself (an angry
 * reply, "this is spam") is recorded here. It suppresses the address and, like any complaint in the
 * last 7 days, pauses outreach on the next tick.
 */
export async function markComplaint(id: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  const { data } = await owner.supabase.from("prospects").select("email").eq("id", id).single();
  try {
    await ox.addMessage({ prospect_id: id, direction: "in", kind: "complaint", status: "received", subject: "Spam complaint", body: "Marked as a complaint in /admin." });
    await ox.stop(data?.email ?? "", "complaint", id);
  } catch (e) {
    return fail(e);
  }
  return done("Recorded. Outreach pauses on the next tick.");
}

export type ThreadMessage = { id: string; direction: string; kind: string; status: string; step: number | null; subject: string; body: string; sent_at: string | null; created_at: string; error: string | null };

export async function getThread(prospectId: string): Promise<ThreadMessage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  const { data } = await owner.supabase
    .from("outreach_messages")
    .select("id, direction, kind, status, step, subject, body, sent_at, created_at, error")
    .eq("prospect_id", prospectId)
    .order("created_at");
  return data ?? [];
}

/** Deletes an unsent draft and writes a new one from the same audit (current template and prompt). */
export async function redraft(id: string): Promise<Result> {
  const owner = await getOwner();
  if (!owner) return fail("Not allowed.");
  try {
    const prospect = await ox.deleteDraft(id);
    if (!prospect) return fail("Only unsent drafts can be redrafted.");
    const state = await ox.state();
    const made = await draftNew(state, 1, prospect);
    return done(made ? "Redrafted." : "Draft removed; the prospect isn't ready for a new one.");
  } catch (e) {
    return fail(e);
  }
}