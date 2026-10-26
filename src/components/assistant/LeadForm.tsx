"use client";

import { useId, useState } from "react";
import { BUDGETS, EMAIL_PATTERN, PROJECT_TYPES, isPhone, type LeadSource } from "@/lib/leads/options";
import "../styles/LeadForm.css";

type Props = {
  source: LeadSource;
  /** Chat session, so the lead links to its transcript in /admin/leads. */
  session?: string | null;
  /** Smaller layout for the chat panel. */
  compact?: boolean;
  onSent?: () => void;
};

type Status = { state: "idle" | "sending" | "sent" } | { state: "error"; message: string };

const LeadForm = ({ source, session = null, compact = false, onSent }: Props) => {
  const id = useId();
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!EMAIL_PATTERN.test(email)) {
      setStatus({ state: "error", message: "Please enter a valid email address." });
      return;
    }
    const phone = String(form.get("phone") ?? "").trim();
    if (phone && !isPhone(phone)) {
      setStatus({ state: "error", message: "Please enter a valid WhatsApp number, or leave it empty." });
      return;
    }
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          source,
          session,
          page: window.location.pathname,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setStatus({ state: "sent" });
      onSent?.();
    } catch (err) {
      setStatus({ state: "error", message: (err as Error).message });
    }
  };

  if (status.state === "sent") {
    return (
      <div className={`lead-form lead-form-done${compact ? " is-compact" : ""}`} role="status">
        <strong>Thanks, your details are on their way.</strong>
        <p>Hamza will reply by email within 24 hours. Check your inbox for a confirmation.</p>
      </div>
    );
  }

  return (
    <form className={`lead-form${compact ? " is-compact" : ""}`} onSubmit={onSubmit} noValidate>
      <div className="lead-form-row">
        <label htmlFor={`${id}-name`}>Name</label>
        <input id={`${id}-name`} name="name" required maxLength={120} autoComplete="name" />
      </div>
      <div className="lead-form-row">
        <label htmlFor={`${id}-email`}>Email</label>
        <input id={`${id}-email`} name="email" type="email" required maxLength={254} autoComplete="email" />
      </div>
      <div className="lead-form-row">
        <label htmlFor={`${id}-phone`}>WhatsApp number (optional)</label>
        <input id={`${id}-phone`} name="phone" type="tel" maxLength={40} autoComplete="tel" placeholder="+92 300 1234567" />
      </div>
      <div className="lead-form-pair">
        <div className="lead-form-row">
          <label htmlFor={`${id}-type`}>Project type</label>
          <select id={`${id}-type`} name="projectType" defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {PROJECT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="lead-form-row">
          <label htmlFor={`${id}-budget`}>Budget</label>
          <select id={`${id}-budget`} name="budget" defaultValue="">
            <option value="" disabled>
              Choose a range
            </option>
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="lead-form-row">
        <label htmlFor={`${id}-message`}>{compact ? "Anything to add? (optional)" : "About your project"}</label>
        <textarea id={`${id}-message`} name="message" rows={compact ? 2 : 5} maxLength={4000} />
      </div>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="lead-form-trap" aria-hidden="true" />
      {status.state === "error" && (
        <p className="lead-form-error" role="alert">
          {status.message}
        </p>
      )}
      <button type="submit" className="lead-form-submit" disabled={status.state === "sending"}>
        {status.state === "sending" ? "Sending…" : "Send to Hamza"}
      </button>
    </form>
  );
};

export default LeadForm;
