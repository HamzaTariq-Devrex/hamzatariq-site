"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LeadForm from "@/components/assistant/LeadForm";
import { trackEvent, trackToolUsed } from "@/lib/analytics";
import BookCall from "@/components/site/BookCall";
import { GROUP_LABELS, scoreBand, type AuditResponse, type Check, type CheckGroup, type CheckStatus } from "@/lib/audit/types";

const STEPS = [
  "Downloading the raw HTML, like a crawler…",
  "Checking titles, meta tags and headings…",
  "Looking for robots.txt, sitemap and structured data…",
  "Running Google PageSpeed on mobile (this takes the longest)…",
];
const STATUS_LABEL: Record<CheckStatus, string> = { pass: "Good", warn: "Improve", fail: "Fix", skip: "Not measured" };
const ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, skip: 2, pass: 3 };

type State = { kind: "idle" } | { kind: "loading"; step: number } | { kind: "error"; message: string } | { kind: "done"; data: AuditResponse };

const ScoreRing = ({ score }: { score: number }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className={`audit-ring is-${scoreBand(score)}`} role="img" aria-label={`SEO score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="audit-ring-track" />
        <circle cx="60" cy="60" r={r} className="audit-ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span>
        {score}
        <small>/100</small>
      </span>
    </div>
  );
};

const CheckItem = ({ check }: { check: Check }) => (
  <li className={`audit-check is-${check.status}`}>
    <span className="audit-pill">{STATUS_LABEL[check.status]}</span>
    <div>
      <h3>{check.label}</h3>
      <p>{check.detail}</p>
      {check.fix && (
        <p className="audit-fix">
          <strong>How to fix:</strong> {check.fix}
        </p>
      )}
    </div>
  </li>
);

const AuditTool = () => {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [url, setUrl] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind !== "loading") return;
    const t = setTimeout(() => setState((s) => (s.kind === "loading" && s.step < STEPS.length - 1 ? { ...s, step: s.step + 1 } : s)), 3500);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (state.kind === "done" || state.kind === "error") resultRef.current?.focus();
  }, [state.kind]);

  const run = async (target: string) => {
    if (!target.trim()) return;
    setState({ kind: "loading", step: 0 });
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target }) });
      const data = (await res.json().catch(() => ({}))) as AuditResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setState({ kind: "done", data });
      trackToolUsed("free-seo-audit");
      if (!data.cached) trackEvent("audit_run", { score: data.result.score });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(url);
  };

  // Entry points across the site link here with ?url=…: fill the field and start right away.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fromLink = new URLSearchParams(window.location.search).get("url")?.trim().slice(0, 500);
    if (!fromLink) return;
    setUrl(fromLink);
    run(fromLink);
  }, []);

  const loading = state.kind === "loading";
  const result = state.kind === "done" ? state.data.result : null;
  const toFix = result ? result.checks.filter((c) => c.status === "fail" || c.status === "warn").length : 0;

  return (
    <div className="audit">
      <form className="audit-form" onSubmit={onSubmit}>
        <label htmlFor="audit-url" className="audit-sr">
          Website address
        </label>
        <input
          id="audit-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourwebsite.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={500}
          required
          disabled={loading}
        />
        <button type="submit" className="page-btn page-btn-primary" disabled={loading}>
          {loading ? "Checking…" : "Check my site"}
        </button>
      </form>
      <p className="audit-hint">Free, no sign-up. Checks one page (usually your home page) in under a minute.</p>

      {loading && (
        <div className="audit-progress" role="status" aria-live="polite">
          <span className="audit-spinner" aria-hidden="true" />
          {STEPS[state.step]}
        </div>
      )}

      <div ref={resultRef} tabIndex={-1} className="audit-result-anchor" aria-live="polite">
        {state.kind === "error" && (
          <p className="audit-error" role="alert">
            {state.message}
          </p>
        )}

        {result && state.kind === "done" && (
          <div className="audit-result">
            <div className="audit-summary x-card">
              <ScoreRing score={result.score} />
              <div>
                <p className="audit-host">{new URL(result.finalUrl).hostname}</p>
                <h2>
                  {result.score >= 90 ? "Strong technical SEO." : result.score >= 50 ? "A good base, with things to fix." : "Search engines are struggling with this page."}
                </h2>
                <p>
                  {toFix ? `${toFix} thing${toFix > 1 ? "s" : ""} to fix or improve, most important first.` : "No problems found on this page."}
                  {state.data.cached && " (Checked in the last 24 hours, so this is the saved result.)"}
                </p>
              </div>
            </div>

            {(Object.keys(GROUP_LABELS) as CheckGroup[]).map((g) => {
              const checks = result.checks.filter((c) => c.group === g).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
              if (!checks.length) return null;
              return (
                <section key={g} className="audit-group">
                  <h2>{GROUP_LABELS[g]}</h2>
                  <ul>
                    {checks.map((c) => (
                      <CheckItem key={c.id} check={c} />
                    ))}
                  </ul>
                  {g === "speed" && result.pagespeed && (result.pagespeed.field.length > 0 || result.pagespeed.lab.length > 0) && (
                    <dl className="audit-metrics">
                      {[...result.pagespeed.field.map((m) => ({ ...m, label: `${m.label} (real users)` })), ...result.pagespeed.lab].map((m) => (
                        <div key={m.label} className={`is-${m.status}`}>
                          <dt>{m.label}</dt>
                          <dd>{m.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              );
            })}

            <div className="audit-next">
              <div className="audit-report x-card">
                <h2>Email me the full report</h2>
                <p>Get every check and fix in your inbox, to keep or send to your developer.</p>
                {state.data.id ? (
                  <LeadForm source="seo-audit" auditId={state.data.id} compact />
                ) : (
                  <p className="audit-hint">The report can&apos;t be emailed right now. Please run the audit again in a minute.</p>
                )}
              </div>
              <div className="audit-cta x-card">
                <h2>Want me to fix this?</h2>
                <p>
                  SEO audit from <strong>$150</strong>: a full report and a fix plan in priority order, delivered in 2–3 days. I can also do the fixes for you.
                </p>
                <div className="x-actions">
                  <BookCall />
                  <Link href="/services/react-nextjs-seo" className="page-btn page-btn-ghost">
                    See the SEO service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTool;
