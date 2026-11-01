// Chatbot ROI calculator. Every input comes from the visitor; nothing here is a benchmark.
// Shared by the browser UI and /api/leads (which recomputes it from the inputs).
import { SERVICES } from "@/data/services";

export type RoiInput = {
  questionsPerDay: number;
  minutesPerAnswer: number;
  hourlyCost: number;
  /** Days per month someone answers questions. */
  daysPerMonth: number;
  /** Share of questions the chatbot could answer on its own, 0-100 (the visitor's own guess). */
  sharePercent: number;
};

export type RoiResult = { hoursPerMonth: number; savedPerMonth: number; savedPerYear: number; paybackMonths: number | null };

export const CHATBOT_PRICE = SERVICES.find((s) => s.slug === "ai-chatbots")!.pricing[0].price;

export const ROI_LIMITS: Record<keyof RoiInput, { min: number; max: number; step: number }> = {
  questionsPerDay: { min: 1, max: 5000, step: 1 },
  minutesPerAnswer: { min: 0.5, max: 120, step: 0.5 },
  hourlyCost: { min: 1, max: 500, step: 1 },
  daysPerMonth: { min: 1, max: 31, step: 1 },
  sharePercent: { min: 0, max: 100, step: 5 },
};

export const roi = (i: RoiInput): RoiResult => {
  const hoursPerMonth = (i.questionsPerDay * i.minutesPerAnswer * i.daysPerMonth * (i.sharePercent / 100)) / 60;
  const savedPerMonth = hoursPerMonth * i.hourlyCost;
  return {
    hoursPerMonth,
    savedPerMonth,
    savedPerYear: savedPerMonth * 12,
    paybackMonths: savedPerMonth > 0 ? CHATBOT_PRICE / savedPerMonth : null,
  };
};

export const isRoiInput = (value: unknown): value is RoiInput => {
  const v = value as Record<string, unknown>;
  return (
    !!v &&
    (Object.keys(ROI_LIMITS) as (keyof RoiInput)[]).every((k) => {
      const n = v[k];
      return typeof n === "number" && Number.isFinite(n) && n >= ROI_LIMITS[k].min && n <= ROI_LIMITS[k].max;
    })
  );
};

const fmt = (n: number, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const money = (n: number) => `$${fmt(n)}`;
export const hours = (n: number) => fmt(n, n < 10 ? 1 : 0);

export const summarizeRoi = (i: RoiInput, r: RoiResult) =>
  [
    `Questions per day: ${i.questionsPerDay}`,
    `Minutes per answer: ${i.minutesPerAnswer}`,
    `Staff cost per hour: ${money(i.hourlyCost)}`,
    `Days per month: ${i.daysPerMonth}`,
    `Share the chatbot answers: ${i.sharePercent}%`,
    `Time saved: ${hours(r.hoursPerMonth)} hours/month`,
    `Money saved: ${money(r.savedPerMonth)}/month (${money(r.savedPerYear)}/year)`,
    `Chatbot from ${money(CHATBOT_PRICE)} one-time${r.paybackMonths ? `; pays for itself in about ${fmt(r.paybackMonths, 1)} months` : ""}`,
  ].join("\n");
