"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authClient, getOwner } from "@/lib/supabase/server";

const STATUSES = ["new", "replied", "won", "lost"] as const;
export type LeadStatus = (typeof STATUSES)[number];

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const owner = await getOwner();
  if (!owner || !STATUSES.includes(status)) return { error: "Not allowed." };
  // RLS: only the owner can update, and only the status column.
  const { error } = await owner.supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/leads");
  return { error: null };
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
