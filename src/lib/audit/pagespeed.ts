// Google PageSpeed Insights (mobile). Works without a key on a small shared quota;
// set PAGESPEED_API_KEY (free, Google Cloud console) for a reliable daily quota.
import type { CheckStatus, Metric, PageSpeed } from "./types";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

type LhAudit = { displayValue?: string; score?: number | null };
type FieldMetric = { percentile?: number; category?: "FAST" | "AVERAGE" | "SLOW" };
type PsiResponse = {
  lighthouseResult?: { categories?: { performance?: { score?: number | null } }; audits?: Record<string, LhAudit> };
  loadingExperience?: { metrics?: Record<string, FieldMetric>; origin_fallback?: boolean };
  error?: { message?: string; code?: number };
};

const fromScore = (score: number | null | undefined): CheckStatus =>
  score == null ? "skip" : score >= 0.9 ? "pass" : score >= 0.5 ? "warn" : "fail";
const fromCategory = (category?: string): CheckStatus => (category === "FAST" ? "pass" : category === "AVERAGE" ? "warn" : category === "SLOW" ? "fail" : "skip");

const LAB: [string, string][] = [
  ["largest-contentful-paint", "Largest Contentful Paint"],
  ["cumulative-layout-shift", "Cumulative Layout Shift"],
  ["total-blocking-time", "Total Blocking Time"],
  ["first-contentful-paint", "First Contentful Paint"],
  ["speed-index", "Speed Index"],
];

const FIELD: [string, string, (p: number) => string][] = [
  ["LARGEST_CONTENTFUL_PAINT_MS", "Largest Contentful Paint", (p) => `${(p / 1000).toFixed(1)} s`],
  ["INTERACTION_TO_NEXT_PAINT", "Interaction to Next Paint", (p) => `${p} ms`],
  ["CUMULATIVE_LAYOUT_SHIFT_SCORE", "Cumulative Layout Shift", (p) => (p / 100).toFixed(2)],
];

export class PageSpeedError extends Error {}

export const runPageSpeed = async (url: string, timeoutMs = 40000): Promise<PageSpeed> => {
  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  const key = process.env.PAGESPEED_API_KEY?.trim();
  if (key) params.set("key", key);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch {
    throw new PageSpeedError("Google PageSpeed took too long to answer, so speed is not part of this score.");
  }
  const data = (await res.json().catch(() => ({}))) as PsiResponse;
  if (!res.ok || !data.lighthouseResult) {
    throw new PageSpeedError(
      res.status === 429
        ? "Google PageSpeed is busy right now, so speed is not part of this score. Try again in a few minutes."
        : "Google PageSpeed could not test this page, so speed is not part of this score.",
    );
  }
  const audits = data.lighthouseResult.audits ?? {};
  const perf = data.lighthouseResult.categories?.performance?.score;
  const metrics = data.loadingExperience?.origin_fallback ? {} : (data.loadingExperience?.metrics ?? {});
  return {
    performance: perf == null ? null : Math.round(perf * 100),
    lab: LAB.filter(([id]) => audits[id]?.displayValue).map(([id, label]): Metric => ({
      label,
      value: audits[id].displayValue!.replace(/\s+/g, " "),
      status: fromScore(audits[id].score),
    })),
    field: FIELD.filter(([id]) => metrics[id]?.percentile != null).map(([id, label, fmt]): Metric => ({
      label,
      value: fmt(metrics[id].percentile!),
      status: fromCategory(metrics[id].category),
    })),
  };
};
