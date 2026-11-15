"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/admin/labels";
import { BUSINESS_TYPES, SEARCH_COUNTRIES } from "@/lib/outreach/osm-types";
import { addSearch, deleteSearch, runSearchNow, toggleSearch } from "@/app/admin/(dashboard)/prospects/actions";

export type SearchRow = { id: string; business_type: string; city: string; country: string; active: boolean; timezone: string | null; last_run_at: string | null; last_found: number };

/** Saved searches: business type + city. The daily cron runs the active ones. */
const SearchManager = ({ searches }: { searches: SearchRow[] }) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState("jewellery");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("GB");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ error: string | null; info?: string }>, after?: () => void) =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      setMessage(res.error ? { error: true, text: res.error } : res.info ? { error: false, text: res.info } : null);
      if (!res.error) after?.();
      router.refresh();
    });

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>Saved searches</h2>
        <span className="adm-muted">{searches.filter((s) => s.active).length} active · rotated daily, max 150 new businesses a day</span>
      </div>
      <form
        className="ox-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addSearch(type, city, country), () => setCity(""));
        }}
      >
        <label className="adm-field">
          <span>Business type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(BUSINESS_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field">
          <span>City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" maxLength={80} required />
        </label>
        <label className="adm-field">
          <span>Country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {SEARCH_COUNTRIES.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="adm-btn is-primary" disabled={pending}>
          Add search
        </button>
      </form>
      {message && (
        <p className={message.error ? "adm-error" : "adm-saved"} role="status">
          {message.text}
        </p>
      )}
      {searches.length ? (
        <ul className="ox-searches">
          {searches.map((s) => (
            <li key={s.id} className={s.active ? "" : "is-off"}>
              <div>
                <strong>
                  {BUSINESS_TYPES[s.business_type as keyof typeof BUSINESS_TYPES]?.label ?? s.business_type}, {s.city}
                </strong>
                <span className="adm-muted">
                  {s.country}
                  {s.timezone ? ` · ${s.timezone}` : ""} · {s.last_run_at ? `last run ${formatDate(s.last_run_at)}, ${s.last_found} new` : "not run yet"}
                </span>
              </div>
              <div className="ox-search-actions">
                <button type="button" className="adm-link-btn" disabled={pending} onClick={() => run(() => runSearchNow(s.id))}>
                  Run now
                </button>
                <button type="button" className="adm-link-btn" disabled={pending} onClick={() => run(() => toggleSearch(s.id, !s.active))}>
                  {s.active ? "Switch off" : "Switch on"}
                </button>
                <button
                  type="button"
                  className="adm-link-btn is-danger"
                  disabled={pending}
                  onClick={() => window.confirm(`Delete the search "${s.city}"? Businesses already found stay.`) && run(() => deleteSearch(s.id))}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-muted">No searches yet. Add one above, for example Jewellery store, London.</p>
      )}
    </section>
  );
};

export default SearchManager;
