"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SITE } from "@/lib/site";
import { SOURCE_LABELS, STATUSES, STATUS_LABELS, formatDate, serviceLabel, type LeadStatus } from "@/lib/admin/labels";
import { getTranscript, updateLeadNotes, updateLeadStatus, type TranscriptMessage } from "@/app/admin/(dashboard)/actions";
import type { Lead } from "./LeadsBrowser";
import Transcript from "./Transcript";

// wa.me needs the number with its country code. A Pakistani mobile typed locally (03xx xxxxxxx)
// is converted to 92...; anything else is used as typed, minus spaces and symbols.
const whatsappUrl = (phone: string) => {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
};

const gmailUrl = (lead: Lead) => {
  const subject = `Re: your ${lead.project_type ? `${lead.project_type} ` : ""}enquiry on hamzatariq.site`;
  const params = new URLSearchParams({ authuser: SITE.email, view: "cm", fs: "1", to: lead.email, su: subject });
  return `https://mail.google.com/mail/?${params}`;
};

const LeadPanel = ({ lead, onClose }: { lead: Lead; onClose: () => void }) => {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(lead.status as LeadStatus);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[] | null>(null);
  // Separate transitions, so saving notes isn't blocked while a status change refreshes the page.
  const [statusPending, startStatus] = useTransition();
  const [notesPending, startNotes] = useTransition();

  // Focus the panel once when it opens; a ref keeps Escape working without re-running this on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (lead.session_id) getTranscript(lead.session_id).then(setTranscript);
  }, [lead.session_id]);

  const changeStatus = (next: LeadStatus) => {
    const previous = status;
    setStatus(next);
    setError("");
    startStatus(async () => {
      const res = await updateLeadStatus(lead.id, next);
      if (res.error) {
        setStatus(previous);
        setError(res.error);
      } else router.refresh();
    });
  };

  const saveNotes = () => {
    setNotesState("saving");
    setError("");
    startNotes(async () => {
      const res = await updateLeadNotes(lead.id, notes);
      if (res.error) {
        setNotesState("idle");
        setError(res.error);
      } else {
        setNotesState("saved");
        router.refresh();
      }
    });
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(lead.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy. Select the email above instead.");
    }
  };

  const details: [string, React.ReactNode][] = [
    ["Email", lead.email],
    ["WhatsApp", lead.phone || "-"],
    ["Service", serviceLabel(lead.project_type)],
    ["Project type", lead.project_type || "-"],
    ["Budget", lead.budget || "-"],
    ["Source", SOURCE_LABELS[lead.source] ?? lead.source],
    [
      "Page",
      lead.page ? (
        <a href={lead.page} target="_blank" rel="noreferrer">
          {lead.page}
        </a>
      ) : (
        "-"
      ),
    ],
    ["Received", formatDate(lead.created_at)],
    ["Notification email", lead.notified_at ? "Sent" : "Not sent"],
  ];

  return (
    <div className="adm-panel-layer">
      <button type="button" className="adm-panel-backdrop" aria-label="Close lead details" onClick={onClose} />
      <div className="adm-panel" role="dialog" aria-modal="true" aria-labelledby="adm-panel-title" ref={panelRef} tabIndex={-1}>
        <div className="adm-panel-head">
          <div>
            <h2 id="adm-panel-title">{lead.name}</h2>
            <p>{formatDate(lead.created_at)}</p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="adm-panel-body">
          <div className="adm-actions">
            <a className="adm-btn is-primary" href={gmailUrl(lead)} target="_blank" rel="noreferrer">
              Reply by email
            </a>
            {lead.phone && (
              <a className="adm-btn is-whatsapp" href={whatsappUrl(lead.phone)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
            <button type="button" className="adm-btn" onClick={copyEmail}>
              {copied ? "Copied ✓" : "Copy email"}
            </button>
          </div>

          <label className="adm-field">
            <span>Status</span>
            <select value={status} onChange={(e) => changeStatus(e.target.value as LeadStatus)} disabled={statusPending} className={`is-${status}`}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <dl className="adm-details">
            {details.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {lead.message && (
            <div className="adm-block">
              <h3>Message</h3>
              <p className="adm-message">{lead.message}</p>
            </div>
          )}

          <div className="adm-block">
            <h3>Private notes</h3>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesState("idle");
              }}
              maxLength={4000}
              rows={4}
              placeholder="Only you can see these notes."
              aria-label="Private notes"
            />
            <div className="adm-notes-row">
              <button type="button" className="adm-btn" onClick={saveNotes} disabled={notesPending || notes === (lead.notes ?? "")}>
                {notesState === "saving" ? "Saving…" : "Save notes"}
              </button>
              {notesState === "saved" && <span className="adm-saved">Saved ✓</span>}
            </div>
          </div>

          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}

          {lead.session_id && (
            <div className="adm-block">
              <h3>Chat transcript</h3>
              {transcript === null ? <p className="adm-muted">Loading the chat…</p> : <Transcript messages={transcript} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadPanel;
