"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import LeadForm from "@/components/assistant/LeadForm";
import { CHATBOT_ROI_TOOL } from "@/data/tools";
import { CHATBOT_PRICE, ROI_LIMITS, hours, money, roi, type RoiInput } from "@/lib/tools/roi";
import { trackToolUsed } from "@/lib/analytics";

const FIELDS: { key: keyof RoiInput; label: string; unit: string; help: string }[] = [
  { key: "questionsPerDay", label: "Customer questions per day", unit: "questions", help: "Messages, calls and emails your team answers about prices, delivery, opening hours and so on." },
  { key: "minutesPerAnswer", label: "Minutes to answer one", unit: "min", help: "Reading, looking things up and replying." },
  { key: "hourlyCost", label: "Staff cost per hour", unit: "USD", help: "What an hour of the person answering costs you." },
  { key: "daysPerMonth", label: "Days per month you answer", unit: "days", help: "Use 30 if questions come in every day." },
  { key: "sharePercent", label: "Questions a chatbot could answer", unit: "%", help: "Your own guess: the share that are repeat questions with answers on your site." },
];

const DEFAULTS: RoiInput = { questionsPerDay: 20, minutesPerAnswer: 4, hourlyCost: 10, daysPerMonth: 30, sharePercent: 50 };

const RoiCalculator = () => {
  const [values, setValues] = useState<RoiInput>(DEFAULTS);
  const r = useMemo(() => roi(values), [values]);

  const set = (key: keyof RoiInput, raw: string) => {
    trackToolUsed(CHATBOT_ROI_TOOL.slug);
    const { min, max } = ROI_LIMITS[key];
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) return;
    setValues((v) => ({ ...v, [key]: Math.min(max, Math.max(min, n)) }));
  };

  const v = values;
  return (
    <div className="calc">
      <div className="calc-inputs x-card">
        {FIELDS.map((f) => (
          <div key={f.key} className="calc-field">
            <label htmlFor={`roi-${f.key}`}>{f.label}</label>
            <div className="calc-number">
              <input
                id={`roi-${f.key}`}
                type="number"
                inputMode="decimal"
                min={ROI_LIMITS[f.key].min}
                max={ROI_LIMITS[f.key].max}
                step={ROI_LIMITS[f.key].step}
                defaultValue={DEFAULTS[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                aria-describedby={`roi-${f.key}-help`}
              />
              <span>{f.unit}</span>
            </div>
            <p id={`roi-${f.key}-help`}>{f.help}</p>
          </div>
        ))}
      </div>

      <div className="calc-result x-card" aria-live="polite">
        <span className="x-label">Your estimate</span>
        <p className="calc-big">
          {hours(r.hoursPerMonth)} <small>hours saved / month</small>
        </p>
        <p className="calc-time">
          Worth <strong>{money(r.savedPerMonth)}</strong> a month, <strong>{money(r.savedPerYear)}</strong> a year.
        </p>

        <div className="calc-formula">
          <p>How it&apos;s calculated</p>
          <code>
            {v.questionsPerDay} questions × {v.minutesPerAnswer} min × {v.daysPerMonth} days × {v.sharePercent}% ÷ 60 = <b>{hours(r.hoursPerMonth)} h</b>
          </code>
          <code>
            {hours(r.hoursPerMonth)} h × {money(v.hourlyCost)} = <b>{money(r.savedPerMonth)} / month</b>
          </code>
          {r.paybackMonths !== null && (
            <code>
              {money(CHATBOT_PRICE)} chatbot ÷ {money(r.savedPerMonth)} = <b>{r.paybackMonths < 1 ? "under 1 month" : `${r.paybackMonths.toFixed(1)} months`}</b> to pay back
            </code>
          )}
        </div>
        <p className="calc-note">
          Only your numbers are used. My AI chatbot starts at {money(CHATBOT_PRICE)} one-time and is usually live in 3–5 days; AI usage is billed by
          the provider to your own account and can start on a free tier.
        </p>
        <div className="calc-actions">
          <Link href="/services/ai-chatbots" className="page-btn page-btn-primary">
            See the AI chatbot service
          </Link>
        </div>
        <div className="calc-email">
          <h2>Get a demo for your business</h2>
          <LeadForm source="chatbot-roi-calculator" toolInput={values} submitLabel="Email me this estimate" compact />
        </div>
      </div>
    </div>
  );
};

export default RoiCalculator;
