// 24-hour cache and per-IP rate limit for the SEO audit tool, in Supabase (seo_audits) with an
// in-memory fallback, so the tool keeps working if the database is unavailable.
import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import { rpcClient, serverSecret } from "@/lib/supabase/server";
import type { AuditResult } from "./types";

export const AUDITS_PER_HOUR = 10;
const CACHE_HOURS = 24;

type Stored = { id: string | null; result: AuditResult; at: number };
const memoryCache = new Map<string, Stored>();
const memoryHits = new Map<string, number[]>();

/** Cache key: lower-case host, no hash, no trailing slash. */
export const cacheKey = (url: URL) => {
  const u = new URL(url.toString());
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  return u.toString().replace(/\/$/, "");
};

export const getCachedAudit = async (key: string): Promise<Stored | null> => {
  const db = rpcClient();
  if (db) {
    const { data, error } = await db.rpc("app_cached_audit", { p_secret: serverSecret(), p_url: key, p_hours: CACHE_HOURS });
    if (!error && data?.[0]) return { id: data[0].id, result: data[0].result as unknown as AuditResult, at: Date.parse(data[0].created_at) };
    if (error) console.error("app_cached_audit:", error.message);
  }
  const hit = memoryCache.get(key);
  return hit && Date.now() - hit.at < CACHE_HOURS * 3_600_000 ? hit : null;
};

export const getAuditById = async (id: string): Promise<AuditResult | null> => {
  const db = rpcClient();
  if (db) {
    const { data, error } = await db.rpc("app_get_audit", { p_secret: serverSecret(), p_id: id });
    if (!error && data?.[0]) return data[0].result as unknown as AuditResult;
  }
  return [...memoryCache.values()].find((s) => s.id === id)?.result ?? null;
};

export const saveAudit = async (key: string, result: AuditResult, ipHash: string): Promise<string> => {
  let id: string | null = null;
  const db = rpcClient();
  if (db) {
    const { data, error } = await db.rpc("app_save_audit", {
      p_secret: serverSecret(),
      p_url: key,
      p_final_url: result.finalUrl,
      p_score: result.score,
      p_result: result as unknown as Json,
      p_ip_hash: ipHash,
    });
    if (error) console.error("app_save_audit:", error.message);
    else id = data;
  }
  // Without the database the audit lives in this instance's memory, so the report can still be emailed.
  id ??= randomUUID();
  memoryCache.set(key, { id, result, at: Date.now() });
  if (memoryCache.size > 200) memoryCache.delete(memoryCache.keys().next().value!);
  return id;
};

/** True when this visitor has run too many new audits in the last hour (cached results don't count). */
export const auditLimited = async (ipHash: string) => {
  const now = Date.now();
  const recent = (memoryHits.get(ipHash) ?? []).filter((t) => now - t < 3_600_000);
  memoryHits.set(ipHash, recent);
  const db = rpcClient();
  if (db) {
    const { data, error } = await db.rpc("app_audit_recent_count", { p_secret: serverSecret(), p_ip_hash: ipHash, p_minutes: 60 });
    if (!error && typeof data === "number") return Math.max(data, recent.length) >= AUDITS_PER_HOUR;
  }
  return recent.length >= AUDITS_PER_HOUR;
};

export const recordAuditHit = (ipHash: string) => memoryHits.set(ipHash, [...(memoryHits.get(ipHash) ?? []), Date.now()]);
