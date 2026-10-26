"use server";

import { redirect } from "next/navigation";
import { SITE } from "@/lib/site";
import { authClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null; email?: string };

const WRONG = "Wrong email or password";

/** Email + password sign-in for the owner. Every failure shows the same message. */
export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  // The form resets after submit, so the email is sent back to refill it.
  if (email !== SITE.email || !password) return { error: WRONG, email };

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || data.user?.email?.toLowerCase() !== SITE.email) {
    if (data.user) await supabase.auth.signOut();
    return { error: WRONG, email };
  }
  redirect("/admin/leads");
}
