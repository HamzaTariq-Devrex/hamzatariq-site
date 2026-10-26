"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authClient, getOwner } from "@/lib/supabase/server";
import { STATUSES, type LeadStatus } from "@/lib/admin/labels";

// Every action checks the owner again: server actions are public endpoints. RLS also limits
// updates to the owner and to the status and notes columns.

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const owner = await getOwner();
  if (!owner || !STATUSES.includes(status)) return { error: "Not allowed." };
  const { error } = await owner.supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
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

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
