// Core Web Vitals per template: CrUX field data (real Chrome users, page-level when Google has
// enough data, else origin-level) and Lighthouse lab numbers, both from the PageSpeed Insights API.
import { SITE_ORIGIN } from "./config";

type FieldMetric = { percentile?: number; category?: string };
type Psi = {
  lighthouseResult?: { categories?: { performance?: { score?: number | null } }; audits?: Record<string, { numericValue?: number }> };
  loadingExperience?: { metrics?: Record<string, FieldMetric>; overall_category?: string; origin_fallback?: boolean };
  originLoadingExperience?: { metrics?: Record<string, FieldMetric>; overall_category?: string };
};

export const measureCwv = async (template: string, path: string) => {
  const url = `${SITE_ORIGIN}${path}`;
  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  const key = process.env.PAGESPEED_API_KEY?.trim();
  if (key) params.set("key", key);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
  const data = (await res.json().catch(() => ({}))) as Psi & { error?: { message?: string } };
  if (!res.ok || !data.lighthouseResult) throw new Error(`PageSpeed ${res.status}: ${data.error?.message ?? "no result"}`);
  const audits = data.lighthouseResult.audits ?? {};
  const num = (id: string) => (audits[id]?.numericValue != null ? Math.round(audits[id].numericValue!) : null);
  const pageField = data.loadingExperience && !data.loadingExperience.origin_fallback && data.loadingExperience.metrics ? data.loadingExperience : null;
  const field = pageField ?? (data.originLoadingExperience?.metrics ? data.originLoadingExperience : null);
  const m = field?.metrics ?? {};
  const perf = data.lighthouseResult.categories?.performance?.score;
  return {
    template,
    url: path,
    performance: perf == null ? null : Math.round(perf * 100),
    lab_lcp_ms: num("largest-contentful-paint"),
    lab_cls: audits["cumulative-layout-shift"]?.numericValue != null ? Math.round(audits["cumulative-layout-shift"].numericValue! * 1000) / 1000 : null,
    lab_tbt_ms: num("total-blocking-time"),
    field_lcp_ms: m.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    field_inp_ms: m.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
    field_cls: m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null ? m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
    field_category: field?.overall_category ?? null,
    field_source: field ? (pageField ? "page" : "origin") : null,
  };
};
