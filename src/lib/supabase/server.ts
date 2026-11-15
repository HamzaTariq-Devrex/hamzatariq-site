import { createHash, createPublicKey, verify, type JsonWebKey as NodeJwk, type KeyObject } from "node:crypto";
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

// Supabase's public signing keys, cached for the life of the function instance (10 minutes), so
// verifying a session costs no network call. The project signs tokens with ES256.
let jwks: { at: number; keys: Map<string, KeyObject> } | null = null;
const signingKey = async (kid: string) => {
  if (!jwks || Date.now() - jwks.at > 600_000 || !jwks.keys.has(kid)) {
    const res = await timedFetch(`${url}/auth/v1/.well-known/jwks.json`, { headers: { apikey: anonKey! } });
    const body = (await res.json()) as { keys?: (NodeJwk & { kid?: string })[] };
    jwks = { at: Date.now(), keys: new Map((body.keys ?? []).filter((k) => k.kid).map((k) => [k.kid!, createPublicKey({ key: k, format: "jwk" })])) };
  }
  return jwks.keys.get(kid) ?? null;
};

/** Verifies an ES256 access token locally; returns its claims or null. */
const verifyJwt = async (token: string) => {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(Buffer.from(h, "base64url").toString()) as { alg?: string; kid?: string };
    if (header.alg !== "ES256" || !header.kid) return null;
    const key = await signingKey(header.kid);
    if (!key || !verify("sha256", Buffer.from(`${h}.${p}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))) return null;
    const claims = JSON.parse(Buffer.from(p, "base64url").toString()) as { sub?: string; email?: string; exp?: number; aud?: string };
    if (!claims.exp || claims.exp * 1000 < Date.now() || claims.aud !== "authenticated") return null;
    return claims;
  } catch {
    return null;
  }
};

/**
 * The signed-in owner, or null. Checked once per request (React cache). The session comes from the
 * cookie (the middleware refreshes it when it expires) and its JWT is verified locally with the
 * cached public keys, so there is no auth round trip on any page or action. Tokens with another
 * algorithm fall back to getClaims(). Only the owner email can sign up (database trigger), but
 * check anyway.
 */
export const getOwner = cache(async () => {
  const supabase = await authClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  let claims: { sub?: string; email?: string } | null = await verifyJwt(token);
  if (!claims) claims = ((await supabase.auth.getClaims()).data?.claims as { sub?: string; email?: string } | undefined) ?? null;
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : null;
  return claims && email === SITE.email ? { supabase, user: { id: String(claims.sub), email } } : null;
});
