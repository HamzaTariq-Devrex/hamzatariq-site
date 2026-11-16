// Bing Webmaster Tools API (BING_WEBMASTER_API_KEY, optional; Settings → API access in Bing
// Webmaster Tools). Query and page stats come back in weekly buckets; each bucket is stored on its
// start date. Related keywords feed the keyword ideas.
import { SITE_ORIGIN, toPath } from "./config";

const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

export const hasBing = () => !!process.env.BING_WEBMASTER_API_KEY?.trim();

const call = async <T>(method: string, params: Record<string, string>) => {
  const qs = new URLSearchParams({ ...params, apikey: process.env.BING_WEBMASTER_API_KEY!.trim() });
  const res = await fetch(`${BASE}/${method}?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const data = (await res.json().catch(() => ({}))) as { d?: T; Message?: string; ErrorCode?: number };
  if (!res.ok || data.d === undefined) throw new Error(`Bing ${method} ${res.status}: ${data.Message ?? "request failed"}`);
  return data.d;
};

/** "/Date(1700000000000-0800)/" → YYYY-MM-DD */
const day = (value: string) => {
  const ms = Number(/\/Date\((-?\d+)/.exec(value)?.[1]);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
};

type Stat = { Query: string; Date: string; Clicks: number; Impressions: number; AvgImpressionPosition: number; AvgClickPosition: number };

const rows = (stats: Stat[], asPage: boolean) =>
  stats.flatMap((s) => {
    const d = day(s.Date);
    if (!d) return [];
    const page = asPage ? toPath(s.Query) : "";
    if (page === null) return [];
    return [{
      engine: "bing" as const,
      day: d,
      page: page ?? "",
      query: asPage ? "" : s.Query,
      clicks: s.Clicks ?? 0,
      impressions: s.Impressions ?? 0,
      position: s.AvgImpressionPosition > 0 ? Math.round(s.AvgImpressionPosition * 10) / 10 : null,
    }];
  });

export const bingStats = async () => {
  const siteUrl = `${SITE_ORIGIN}/`;
  const [queries, pages] = await Promise.all([call<Stat[]>("GetQueryStats", { siteUrl }), call<Stat[]>("GetPageStats", { siteUrl })]);
  return [...rows(queries, false), ...rows(pages, true)];
};

/** Related keywords with Bing's own impression counts for the last 3 months. */
export const bingRelated = async (q: string) => {
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 86_400_000);
  const list = await call<{ Query: string; Impressions: number; BroadImpressions: number }[]>("GetRelatedKeywords", {
    q,
    country: "us",
    language: "en-US",
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  });
  return list.map((k) => ({ keyword: k.Query, impressions: k.Impressions ?? 0 }));
};
