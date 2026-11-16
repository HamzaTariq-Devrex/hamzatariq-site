// Google Search Console (service account, read-only scope): Search Analytics, URL Inspection and
// sitemaps. GSC_SERVICE_ACCOUNT_JSON is the key file's JSON (raw or base64); the service account's
// email must be a user on the property (URL Inspection needs Full permission).
import { createSign } from "node:crypto";
import { gscSite, toPath } from "./config";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export const hasGsc = () => !!process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();

let token: { value: string; exp: number } | null = null;

const accessToken = async () => {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    cache: "no-store",
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google token: ${data.error_description ?? data.error ?? res.status}`);
  token = { value: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
};

const api = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Search Console ${res.status}: ${data.error?.message ?? "request failed"}`);
  return data;
};

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/**
 * Search Analytics rows by day for [start, end] (inclusive). `by` adds page and/or query to the date
 * dimension. Pages come back as full URLs and are turned into paths; rows for other hosts are dropped.
 */
export const searchAnalytics = async (start: string, end: string, by: ("page" | "query")[]) => {
  const out: { day: string; page: string; query: string; clicks: number; impressions: number; position: number }[] = [];
  const dimensions = ["date", ...by];
  for (let startRow = 0; startRow < 200_000; startRow += 25_000) {
    const data = await api<{ rows?: GscRow[] }>(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite())}/searchAnalytics/query`, {
      method: "POST",
      body: JSON.stringify({ startDate: start, endDate: end, dimensions, rowLimit: 25_000, startRow, dataState: "all" }),
    });
    const rows = data.rows ?? [];
    for (const r of rows) {
      const keys = Object.fromEntries(dimensions.map((d, i) => [d, r.keys[i]]));
      const page = keys.page ? toPath(keys.page) : "";
      if (page === null) continue;
      out.push({ day: keys.date, page, query: keys.query ?? "", clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 });
    }
    if (rows.length < 25_000) break;
  }
  return out;
};

export type Inspection = {
  verdict: string | null;
  coverage_state: string | null;
  robots_state: string | null;
  indexing_state: string | null;
  page_fetch_state: string | null;
  google_canonical: string | null;
  last_crawl: string | null;
};

export const inspectUrl = async (url: string): Promise<Inspection> => {
  const data = await api<{
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: string;
        coverageState?: string;
        robotsTxtState?: string;
        indexingState?: string;
        pageFetchState?: string;
        googleCanonical?: string;
        lastCrawlTime?: string;
      };
    };
  }>("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    body: JSON.stringify({ inspectionUrl: url, siteUrl: gscSite(), languageCode: "en-US" }),
  });
  const s = data.inspectionResult?.indexStatusResult ?? {};
  return {
    verdict: s.verdict ?? null,
    coverage_state: s.coverageState ?? null,
    robots_state: s.robotsTxtState ?? null,
    indexing_state: s.indexingState ?? null,
    page_fetch_state: s.pageFetchState ?? null,
    google_canonical: s.googleCanonical ?? null,
    last_crawl: s.lastCrawlTime && !s.lastCrawlTime.startsWith("1970") ? s.lastCrawlTime : null,
  };
};

export const listSitemaps = async () => {
  const data = await api<{
    sitemap?: {
      path: string;
      lastSubmitted?: string;
      lastDownloaded?: string;
      isPending?: boolean;
      errors?: string;
      warnings?: string;
      contents?: { type: string; submitted?: string; indexed?: string }[];
    }[];
  }>(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite())}/sitemaps`);
  return (data.sitemap ?? []).map((s) => ({
    path: s.path,
    last_submitted: s.lastSubmitted ?? null,
    last_downloaded: s.lastDownloaded ?? null,
    is_pending: s.isPending ?? null,
    errors: Number(s.errors ?? 0),
    warnings: Number(s.warnings ?? 0),
    submitted: (s.contents ?? []).reduce((n, c) => n + Number(c.submitted ?? 0), 0),
    // Search Console no longer reports "indexed" for sitemaps (always 0); URL Inspection is the source.
    indexed: (s.contents ?? []).some((c) => c.indexed != null) ? (s.contents ?? []).reduce((n, c) => n + Number(c.indexed ?? 0), 0) : null,
  }));
};
