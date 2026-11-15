"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveDrafts, discardDraft, redraft, saveDraft, sendTest } from "@/app/admin/(dashboard)/prospects/actions";

export type Draft = {
  id: string;
  step: number | null;
  subject: string;
  body: string;
  created_at: string;
  variant?: string | null;
  prospect: { id: string; name: string; email: string | null; city: string | null; business_type: string; audit_score: number | null; lead_score: number | null } | null;
};

const STEP = ["Email 1", "Day 3 follow-up", "Day 7 last email", "Reply to their reply", "60-day check-back"];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const DraftCard = ({ d, onDone }: { d: Draft; onDone: (msg: { error: boolean; text: string } | null) => void }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(d.subject);
  const [body, setBody] = useState(d.body);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error: string | null; info?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      onDone(res.error ? { error: true, text: res.error } : res.info ? { error: false, text: res.info } : null);
      if (!res.error) after?.();
    });

  return (
    <li className="ox-draft">
      <button type="button" className="ox-draft-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>
          <strong>{d.prospect?.name ?? "Unknown"}</strong>
          <span className="adm-muted">
            {" "}
            · {d.prospect?.email} · {STEP[d.step ?? 0]}
            {d.variant ? ` · subject ${d.variant}` : ""}
            {d.prospect?.audit_score != null ? ` · audit ${d.prospect.audit_score}` : ""}
            {d.prospect?.lead_score != null ? ` · lead ${d.prospect.lead_score}` : ""}
          </span>
        </span>
        <span className="ox-draft-subject">{d.subject}</span>
      </button>
      {open && (
        <div className="ox-draft-body">
          {editing ? (
            <>
              <label className="adm-field">
                <span>Subject ({subject.length}/49)</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={49} />
              </label>
              <label className="adm-field">
                <span>Email ({words(body)} words)</span>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} />
              </label>
            </>
          ) : (
            <pre className="ox-email">{d.body}</pre>
          )}
          <p className="adm-muted">Sent exactly as shown, as plain text. {words(body)} words.</p>
          <div className="adm-actions">
            {editing ? (
              <button type="button" className="adm-btn is-primary" disabled={pending} onClick={() => run(() => saveDraft(d.id, subject, body), () => setEditing(false))}>
                Save
              </button>
            ) : (
              <button type="button" className="adm-btn" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            <button type="button" className="adm-btn" disabled={pending} onClick={() => run(() => sendTest(d.id))}>
              Send test to me
            </button>
            <button type="button" className="adm-btn" disabled={pending} onClick={() => run(() => approveDrafts([d.id]))}>
              Approve this one
            </button>
            {(d.step ?? 0) === 0 && (
              <button type="button" className="adm-btn" disabled={pending} onClick={() => run(() => redraft(d.id))}>
                Redraft
              </button>
            )}
            <button type="button" className="adm-btn is-danger" disabled={pending} onClick={() => run(() => discardDraft(d.id))}>
              Discard
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

/** Today's batch: drafts waiting for approval (approve-first mode). */
const DraftQueue = ({ drafts, approveFirst }: { drafts: Draft[]; approveFirst: boolean }) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const done = (m: { error: boolean; text: string } | null) => {
    setMessage(m);
    router.refresh();
  };

  return (
    <section className="adm-card ox-queue">
      <div className="adm-card-head">
        <h2>
          Waiting for approval <span className="adm-count">{drafts.length}</span>
        </h2>
        {drafts.length > 0 && (
          <button
            type="button"
            className="adm-btn is-primary"
            disabled={pending}
            onClick={() =>
              window.confirm(`Approve the ${drafts.length} emails on this page? They go out over the next days within the daily limit, 9:00–17:00 on weekdays in each business's time zone.`) &&
              start(async () => {
                const res = await approveDrafts(drafts.map((d) => d.id));
                done(res.error ? { error: true, text: res.error } : { error: false, text: res.info ?? "Approved." });
              })
            }
          >
            Approve all on this page ({drafts.length})
          </button>
        )}
      </div>
      {message && (
        <p className={message.error ? "adm-error" : "adm-saved"} role="status">
          {message.text}
        </p>
      )}
      {drafts.length ? (
        <ul className="ox-drafts">
          {drafts.map((d) => (
            <DraftCard key={d.id} d={d} onDone={done} />
          ))}
        </ul>
      ) : (
        <p className="adm-muted">{approveFirst ? "No drafts waiting. New ones appear here after each day's audits." : "Approve-first is off: new drafts are sent automatically."}</p>
      )}
    </section>
  );
};

export default DraftQueue;
