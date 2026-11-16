"use server";

import { revalidatePath } from "next/cache";
import { getOwner } from "@/lib/supabase/server";
import { seoRpc } from "@/lib/seo-center/db";
import { runSync } from "@/lib/seo-center/sync";

// Server actions are public endpoints: every one checks the owner again.

export async function decideFix(id: string, decision: "approve" | "dismiss" | "retry") {
  if (!(await getOwner())) return { error: "Not allowed." };
  if (!["approve", "dismiss", "retry"].includes(decision)) return { error: "Unknown decision." };
  try {
    await seoRpc("app_seo_fix_decide", { p_id: id, p_decision: decision });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/seo");
  return { error: null };
}

export async function decideKeyword(keyword: string, decision: "approve" | "dismiss") {
  if (!(await getOwner())) return { error: "Not allowed." };
  if (!["approve", "dismiss"].includes(decision)) return { error: "Unknown decision." };
  try {
    await seoRpc("app_seo_keyword_decide", { p_keyword: keyword, p_decision: decision });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/seo");
  return { error: null };
}

/** Runs the sync now (whatever is due, and the analysis even if it ran today). */
export async function syncNow() {
  if (!(await getOwner())) return { error: "Not allowed.", result: null };
  try {
    const result = await runSync(45_000, undefined, ["analyse"]);
    revalidatePath("/admin/seo");
    return { error: null, result };
  } catch (e) {
    return { error: (e as Error).message, result: null };
  }
}
