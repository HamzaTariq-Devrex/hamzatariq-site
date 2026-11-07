// Shared helpers for the content autopilot (docs/AUTOPILOT.md). Node 22, no extra packages.
import { createSign } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

export const ROOT = process.cwd();
export const SITE_URL = "https://hamzatariq.site";
// Pace (CLAUDE.md): up to 3 posts per publish day, publish days 2+ days apart, max 12 per ISO week.
// Same-day posts are in different clusters. Keep in sync with content-check.mjs.
export const MAX_POSTS_PER_DAY = 3;
export const MIN_DAYS_BETWEEN_POSTS = 2; // between publish days
export const MAX_POSTS_PER_WEEK = 12;
// Refill: when fewer than MIN_QUEUED topics are queued, add REFILL_COUNT.
export const MIN_QUEUED = 20;
export const REFILL_COUNT = 30;
// Original data from the SEO audit tool needs at least this many audited sites (content/STYLE.md).
export const MIN_AUDIT_SITES = 30;

if (existsSync(join(ROOT, ".env.local"))) process.loadEnvFile(join(ROOT, ".env.local"));

export const log = (...args) => console.error("[autopilot]", ...args);

// ---------- Dates (Pakistan time, UTC+5) ----------
export const todayPkt = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
export const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
export const isoWeek = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  return `${year}-W${String(Math.ceil(((d - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7)).padStart(2, "0")}`;
};

// ---------- Content ----------
const BACKLOG = join(ROOT, "content", "backlog.json");
export const readBacklog = () => JSON.parse(readFileSync(BACKLOG, "utf8"));
export const writeBacklog = (data) => writeFileSync(BACKLOG, `${JSON.stringify(data, null, 2)}\n`);

// Topic clusters (content/seo/clusters.json, strategy in content/seo/strategy.md).
export const readClusters = () => JSON.parse(readFileSync(join(ROOT, "content", "seo", "clusters.json"), "utf8"));
export const briefPath = (slug) => `content/seo/briefs/${slug}.md`;
/** Post slug for a keyword: kebab case, next.js → nextjs (STYLE.md). */
export const slugFor = (keyword) =>
  String(keyword)
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const readPosts = () => {
  const dir = join(ROOT, "content", "blog");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const { data } = matter(readFileSync(join(dir, f), "utf8"));
      const date = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : null);
      return {
        slug: f.replace(/\.mdx$/, ""),
        title: data.title,
        keyword: data.keyword,
        category: data.category,
        cluster: data.cluster ?? null,
        role: data.role ?? "supporting",
        published: date(data.published),
        updated: date(data.updated),
      };
    });
};

export const normalizeKeyword = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Next free publish slot from `from` (default today, PKT). The latest publish day is reused while it
 * is today or later and has room (under 3 posts, week under 12, a cluster not used that day), so one
 * run can fill 3 slots on the same day. Otherwise the next publish day is 2+ days after the latest
 * one, in an ISO week with room left. `exclude` skips days (e.g. no eligible topic for that day).
 */
export const nextPublishSlot = (posts, { from = todayPkt(), clusters = null, exclude = [] } = {}) => {
  const dated = posts.filter((p) => p.published);
  const perWeek = {};
  for (const p of dated) perWeek[isoWeek(p.published)] = (perWeek[isoWeek(p.published)] ?? 0) + 1;
  const onDay = (date) => dated.filter((p) => p.published === date);
  const weekHasRoom = (date) => (perWeek[isoWeek(date)] ?? 0) < MAX_POSTS_PER_WEEK;
  const slot = (date) => ({ date, sameDay: onDay(date).map((p) => ({ slug: p.slug, title: p.title, cluster: p.cluster })) });

  const last = dated.map((p) => p.published).sort().pop();
  if (last && last >= from && !exclude.includes(last)) {
    const used = new Set(onDay(last).map((p) => p.cluster));
    const freeCluster = !clusters || clusters.some((c) => !used.has(c));
    if (onDay(last).length < MAX_POSTS_PER_DAY && weekHasRoom(last) && freeCluster) return slot(last);
  }
  let date = from;
  if (last && addDays(last, MIN_DAYS_BETWEEN_POSTS) > date) date = addDays(last, MIN_DAYS_BETWEEN_POSTS);
  while (!weekHasRoom(date) || exclude.includes(date)) date = addDays(date, 1);
  return slot(date);
};
export const nextPublishDate = (posts, from = todayPkt()) => nextPublishSlot(posts, { from }).date;

// ---------- Supabase (read-only app_* functions) ----------
export const rpc = async (fn, args = {}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVER_SECRET;
  if (!url || !key || !secret) throw new Error("Supabase env vars are missing");
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_secret: secret, ...args }),
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
  return res.json();
};

// ---------- Google Search Console (service account, read-only) ----------
const b64url = (input) => Buffer.from(input).toString("base64url");

const gscToken = async () => {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GSC token: ${data.error_description ?? data.error ?? res.status}`);
  return data.access_token;
};

/** Search Analytics rows for the last `days` days (ending 3 days ago, when GSC data is complete). */
export const gscQuery = async ({ dimensions, days = 28, rowLimit = 250 }) => {
  const site = process.env.GSC_SITE_URL || "sc-domain:hamzatariq.site";
  const end = addDays(todayPkt(), -3);
  const start = addDays(end, -days + 1);
  const token = await gscToken();
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: start, endDate: end, dimensions, rowLimit }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GSC query: ${data.error?.message ?? res.status}`);
  return { start, end, rows: data.rows ?? [] };
};
