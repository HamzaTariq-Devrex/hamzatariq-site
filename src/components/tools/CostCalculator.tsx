"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import LeadForm from "@/components/assistant/LeadForm";
import BookCall from "@/components/site/BookCall";
import { COST_CALCULATOR_TOOL } from "@/data/tools";
import { FEATURES, PAGE_OPTIONS, SITE_TYPES, estimate, usd, type CostInput, type Feature, type PageOption, type SiteType } from "@/lib/tools/cost";
import { trackToolUsed } from "@/lib/analytics";

const CostCalculator = () => {
  const [type, setType] = useState<SiteType>("website");
  const [pages, setPages] = useState<PageOption>("1-5");
  const [features, setFeatures] = useState<Feature[]>([]);
  const input: CostInput = useMemo(() => ({ type, pages, features }), [type, pages, features]);
  const result = useMemo(() => estimate(input), [input]);

  const touch = () => trackToolUsed(COST_CALCULATOR_TOOL.slug);
  const toggle = (f: Feature) => {
    touch();
    setFeatures((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]));
  };

  return (
    <div className="calc">
      <div className="calc-inputs x-card">
        <fieldset>
          <legend>1. What are you building?</legend>
          <div className="calc-types">
            {SITE_TYPES.map((t) => (
              <label key={t.id} className={`calc-option${type === t.id ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name="type"
                  value={t.id}
                  checked={type === t.id}
                  onChange={() => {
                    touch();
                    setType(t.id);
                  }}
                />
                <strong>{t.label}</strong>
                <span>{t.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>2. How many pages?</legend>
          <div className="calc-chips">
            {PAGE_OPTIONS.map((p) => (
              <label key={p.id} className={`calc-chip${pages === p.id ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name="pages"
                  value={p.id}
                  checked={pages === p.id}
                  onChange={() => {
                    touch();
                    setPages(p.id);
                  }}
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>3. Which features do you need?</legend>
          <div className="calc-chips">
            {FEATURES.map((f) => (
              <label key={f.id} className={`calc-chip${features.includes(f.id) ? " is-on" : ""}`}>
                <input type="checkbox" checked={features.includes(f.id)} onChange={() => toggle(f.id)} />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="calc-result x-card" aria-live="polite">
        <span className="x-label">Your estimate</span>
        <p className="calc-big">
          <small>from</small> {usd(result.from)}
        </p>
        <p className="calc-time">
          Delivery: <strong>{result.delivery ? result.delivery.label : "agreed after the free call"}</strong>
        </p>
        <ul className="calc-lines">
          {result.packages.map((p) => (
            <li key={p.name}>
              <span>
                {p.name}
                <small>
                  <Link href={`/services/${p.serviceSlug}`}>{p.service}</Link>
                  {p.timeline ? ` · ${p.timeline}` : ""}
                </small>
              </span>
              <strong>from {usd(p.price)}</strong>
            </li>
          ))}
          {result.addOns.map((a) => (
            <li key={a.name}>
              <span>
                {a.name}
                <small>Add-on</small>
              </span>
              <strong>+{usd(a.price)}</strong>
            </li>
          ))}
          {result.quoted.map((q) => (
            <li key={q} className="is-quoted">
              <span>{q}</span>
              <strong>confirmed on the call</strong>
            </li>
          ))}
        </ul>
        <p className="calc-note">
          Starting prices from my published packages. Payment is 50% upfront and 50% on delivery, with 2 revision rounds and 30 days of free bug
          fixes.
        </p>
        <div className="calc-actions">
          <BookCall />
        </div>
        <div className="calc-email">
          <h2>Email me this estimate</h2>
          <LeadForm source="website-cost-calculator" toolInput={input} submitLabel="Email me this estimate" compact />
        </div>
      </div>
    </div>
  );
};

export default CostCalculator;
