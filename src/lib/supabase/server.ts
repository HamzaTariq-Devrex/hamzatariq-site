import { createHash } from "node:crypto";
import { cache } from "react";
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

/** fetch that logs how long each Supabase call from /admin takes (Vercel function logs: "[admin-db]"). */
const timedFetch: typeof fetch = async (input, init) => {
  const t0 = performance.now();
  const res = await fetch(input, init);
  const u = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  console.log(`[admin-db] ${Math.round(performance.now() - t0)}ms ${init?.method ?? "GET"} ${u.pathname.replace(/^\/(rest|auth)\/v1/, "")} ${res.status}`);
  return res;
};

let adminRpcClient: SupabaseClient<Database> | null = null;
/** app_admin_* functions for /admin pages (called after the owner check), with timing logs. */
export const adminRpc = () => {
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  adminRpcClient ??= createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: timedFetch } });
  return adminRpcClient;
};

/** Cookie-based client for /admin, acting as the signed-in user (RLS applies). Every call is timed. */
export const authClient = async () => {
  const store = await cookies();
  return createServerClient<Database>(url!, anonKey!, {
    global: { fetch: timedFetch },
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

/**
 * The signed-in owner, or null. Checked once per request (React cache), and the session JWT is
 * verified locally: the project signs tokens with ES256, so getClaims() checks the signature with
 * Supabase's public keys (cached) instead of a network call to the auth server on every page.
 * Only the owner email can sign up (database trigger), but check anyway.
 */
export const getOwner = cache(async () => {
  const supabase = await authClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : null;
  return claims && email === SITE.email ? { supabase, user: { id: String(claims.sub), email } } : null;
});
