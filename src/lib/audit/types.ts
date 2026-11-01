// Shared by the audit API, the report email and the browser UI. Safe to import in client components.

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export type CheckGroup = "content" | "meta" | "social" | "crawl" | "speed";

export const GROUP_LABELS: Record<CheckGroup, string> = {
  content: "Content Google can read",
  meta: "Titles and meta tags",
  social: "Social previews and structured data",
  crawl: "Crawling and security",
  speed: "Speed (Core Web Vitals)",
};

export type Check = {
  id: string;
  group: CheckGroup;
  label: string;
  status: CheckStatus;
  /** What was found, in plain words. */
  detail: string;
  /** How to fix it (only when not passing). */
  fix?: string;
  weight: number;
};

export type Metric = { label: string; value: string; status: CheckStatus };

export type PageSpeed = {
  performance: number | null;
  /** Lab metrics from Lighthouse (mobile). */
  lab: Metric[];
  /** Real-user Core Web Vitals from the Chrome UX Report, when Google has enough data. */
  field: Metric[];
};

export type AuditResult = {
  url: string;
  finalUrl: string;
  checkedAt: string;
  score: number;
  checks: Check[];
  pagespeed: PageSpeed | null;
  /** Why PageSpeed is missing, when it is. */
  pagespeedNote?: string;
};

export type AuditResponse = { id: string | null; cached: boolean; result: AuditResult };

export const scoreBand = (score: number): Exclude<CheckStatus, "skip"> => (score >= 90 ? "pass" : score >= 50 ? "warn" : "fail");
