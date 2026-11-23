// Outreach's own Gemini access (owner, 2026-11-18). The site chatbot keeps its model and its quota;
// outreach uses Flash-Lite, which has a separate free quota. Every call:
// - takes one call from today's budget (70% of Flash-Lite's daily free limit, per Pacific day,
//   when Google resets free quotas); over budget → no call, outreach waits until tomorrow;
// - on "high demand" (503) or 429 sets a back-off, so later ticks retry; never a tight loop.
//   A 429 that says the daily limit was hit backs off until the quota resets and stores the real limit.
import { ThinkingLevel } from "@google/genai";
import { gemini } from "@/lib/assistant/gemini";
import { rpcClient, serverSecret } from "@/lib/supabase/server";

export const OUTREACH_MODEL = process.env.OUTREACH_GEMINI_MODEL || "gemini-3.5-flash-lite";
/** Flash-Lite's daily free requests until Google's own 429 message tells us the real number. */
export const DEFAULT_DAILY_LIMIT = Number(process.env.OUTREACH_GEMINI_DAILY_LIMIT || 1000);
export const BUDGET_SHARE = 0.7;

/** The quota day: Google resets free-tier daily quotas at midnight Pacific time. */
export const quotaDay = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
/** Next midnight Pacific (approximate within DST changes: +1 hour slack). */
export const nextReset = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return new Date(now.getTime() + ((24 - h) * 60 - m + 5) * 60_000);
};

type Take = { ok: boolean; reason: "backoff" | "budget" | null; calls: number; limit: number; budget: number; until: string | null };
/** `today` is Google's quota day (Pacific); `since_calls` counts calls since `p_since` (the PKT day start, for /admin). */
export type AiUsage = { today: { calls: number; errors: number; last_error: string | null } | null; learned_limit: number | null; backoff_until: string | null; since_calls?: number; last_24h?: number };

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const db = rpcClient();
  if (!db) throw new Error("Supabase is not configured.");
  const { data, error } = await (db.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, { p_secret: serverSecret(), ...args });
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
};

const PKT = 5 * 3_600_000;
/** Start of today in Pakistan time (no daylight saving). */
const pktDayStart = (now = Date.now()) => new Date(Date.parse(`${new Date(now + PKT).toISOString().slice(0, 10)}T00:00:00Z`) - PKT);

export const aiUsage = () =>
  rpc<AiUsage>("app_ox_ai_usage", { p_day: quotaDay(), p_since: pktDayStart().toISOString() })
    // Before migration 20261123090000 the function has no p_since (and no call log).
    .catch(() => rpc<AiUsage>("app_ox_ai_usage", { p_day: quotaDay() }));

/** Today's budget numbers for /admin and the tick. */
export const aiBudget = async () => {
  const u = await aiUsage();
  const limit = u.learned_limit ?? DEFAULT_DAILY_LIMIT;
  const budget = Math.floor(limit * BUDGET_SHARE);
  const used = u.today?.calls ?? 0;
  const backoff = u.backoff_until && Date.parse(u.backoff_until) > Date.now() ? u.backoff_until : null;
  // Owner, 2026-11-23: the card showed 0 "today" after research had run, because Google's quota day
  // (Pacific) had already rolled over at 13:00 PKT. usedPkt is the owner's own day; used stays the budget.
  return {
    used,
    usedPkt: u.since_calls ?? 0,
    last24h: u.last_24h ?? 0,
    resetsAt: nextReset().toISOString(),
    budget,
    limit,
    limitLearned: u.learned_limit != null,
    errors: u.today?.errors ?? 0,
    lastError: u.today?.last_error ?? null,
    backoff,
    blocked: backoff ? ("backoff" as const) : used >= budget ? ("budget" as const) : null,
  };
};

export class AiUnavailable extends Error {
  constructor(
    public reason: "budget" | "backoff" | "busy" | "error" | "no-key",
    message: string,
  ) {
    super(message);
  }
}

/** Back-off after an error: 429 daily limit → until the quota resets; other 429 → 20 min; busy (503) → 10 min. */
const backoffFor = (msg: string): { until: Date; limit: number | null } => {
  const limit = Number(msg.match(/limit:\s*(\d+)/)?.[1] ?? NaN);
  const daily = /per day|PerDay|requests_per_day|daily/i.test(msg);
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return { until: daily ? nextReset() : new Date(Date.now() + 20 * 60_000), limit: daily && Number.isFinite(limit) ? limit : null };
  return { until: new Date(Date.now() + 10 * 60_000), limit: null };
};

/**
 * One outreach Gemini call returning parsed JSON. Throws AiUnavailable when there's no budget, a
 * back-off is running, or Gemini is busy (the caller tries again on a later tick).
 */
export const outreachJson = async <T>(opts: { system: string; user: string; maxTokens: number; temperature?: number; timeoutMs?: number }): Promise<T> => {
  const ai = gemini();
  if (!ai) throw new AiUnavailable("no-key", "GEMINI_API_KEY is not set");
  const take = await rpc<Take>("app_ox_ai_take", { p_day: quotaDay(), p_default_limit: DEFAULT_DAILY_LIMIT, p_share: BUDGET_SHARE });
  if (!take.ok) throw new AiUnavailable(take.reason ?? "budget", take.reason === "backoff" ? `Gemini back-off until ${take.until}` : `Outreach Gemini budget used (${take.calls}/${take.budget})`);
  try {
    const res = await ai.models.generateContent({
      model: OUTREACH_MODEL,
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      config: {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxTokens,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      },
    });
    return JSON.parse(res.text ?? "{}") as T;
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (/503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|quota/i.test(msg)) {
      const b = backoffFor(msg);
      await rpc("app_ox_ai_error", { p_day: quotaDay(), p_backoff_until: b.until.toISOString(), p_limit: b.limit, p_error: msg.slice(0, 300) }).catch(() => {});
      throw new AiUnavailable("busy", msg.slice(0, 200));
    }
    await rpc("app_ox_ai_error", { p_day: quotaDay(), p_backoff_until: new Date(Date.now() - 1000).toISOString(), p_limit: null, p_error: msg.slice(0, 300) }).catch(() => {});
    throw new AiUnavailable("error", msg.slice(0, 200));
  }
};
