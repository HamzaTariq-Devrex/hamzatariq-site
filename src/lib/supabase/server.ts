import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { SITE } from "@/lib/site";
import type { Database } from "./database.types";
import { withSessionAge } from "./session";

// Server-only. Public writes go through SECURITY DEFINER functions that check SUPABASE_SERVER_SECRET
// (see supabase/migrations); the owner reads data through Supabase Auth and RLS.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let rpc: SupabaseClient<Database> | null = null;

/** Client for the app_* functions, or null when Supabase is not configured. */
export const rpcClient = () => {
  if (!url || !anonKey || !process.env.SUPABASE_SERVER_SECRET) return null;
  rpc ??= createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return rpc;
};

export const serverSecret = () => process.env.SUPABASE_SERVER_SECRET ?? "";

/** Salted hash so rate limits work per visitor without storing raw IP addresses. */
export const hashIp = (ip: string) => createHash("sha256").update(`${serverSecret()}:${ip}`).digest("hex");

/** Cookie-based client for /admin, acting as the signed-in user (RLS applies). */
export const authClient = async () => {
  const store = await cookies();
  return createServerClient<Database>(url!, anonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, withSessionAge(options)));
        } catch {
          // Server components cannot set cookies; the middleware refreshes the session instead.
        }
      },
    },
  });
};

/** The signed-in owner, or null. Only the owner email can sign up (database trigger), but check anyway. */
export const getOwner = async () => {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  return user && user.email?.toLowerCase() === SITE.email ? { supabase, user } : null;
};
