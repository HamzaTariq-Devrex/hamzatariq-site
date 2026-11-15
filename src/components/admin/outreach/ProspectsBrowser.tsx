"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { whatsappLink, whatsappText } from "@/lib/outreach/whatsapp";
import { MANUAL_PROSPECT_STATUSES, PROSPECT_STATUSES, PROSPECT_STATUS_LABELS, formatDate, type ProspectStatus } from "@/lib/admin/labels";
import { BUSINESS_TYPES } from "@/lib/outreach/osm-types";
import { getThread, markComplaint, updateProspectNotes, updateProspectStatus, type ThreadMessage } from "@/app/admin/(dashboard)/prospects/actions";
import { EmptyState } from "../ui";

export type ProspectRow = {
  id: string;
  name: string;
  business_type: string;
  city: string | null;
  country: string;
  timezone: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  email_source: string | null;
  status: ProspectStatus;
  skip_reason: string | null;
  audit_score: number | null;
  lead_score: number | null;
  notes: string | null;
  lead_id: string | null;
  last_contacted_at: string | null;
  created_at: string;
  audits: { report_id: string; score: number | null; final_url: string | null; created_at: string; expires_at: string }[];
};

export const typeLabel = (t: string) => BUSINESS_TYPES[t as keyof typeof BUSINESS_TYPES]?.label ?? t;
export const latestAudit = (p: ProspectRow) => [...(p.audits ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

/** The shared prefilled WhatsApp message for this prospect (Hamza sends it himself). */
export const messageFor = (p: ProspectRow) => {
  const a = latestAudit(p);
  return whatsappText({ name: p.name, website: a?.final_url ?? null, reportId: a?.report_id ?? null, reportExpires: a?.expires_at ?? null });
};

const STEP = ["First email", "Follow-up 1", "Follow-up 2"];

const Panel = ({ p, onClose }: { p: ProspectRow; onClose: () => void }) => {
  const router = useRouter();
  const [status, setStatus] = useState<ProspectStatus>(p.status);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [thread, setThread] = useState<ThreadMessage[] | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    getThread(p.id).then(setThread);
  }, [p.id]);

  const run = (fn: () => Promise<{ error: string | null; info?: string }>) =>
    start(async () => {
      const res = await fn();
      setMessage(res.error ? { error: true, text: res.error } : res.info ? { error: false, text: res.info } : { error: false, text: "Saved." });
      router.refresh();
    });

  const audit = latestAudit(p);
  const details: [string, React.ReactNode][] = [
    ["Type", `${typeLabel(p.business_type)}${p.city ? `, ${p.city}` : ""} (${p.country})`],
    ["Website", p.website ? <a href={p.website} target="_blank" rel="noreferrer">{p.website}</a> : "None listed"],
    ["Email", p.email ? `${p.email}${p.email_source ? ` (${p.email_source === "osm" ? "OpenStreetMap" : "contact page"})` : ""}` : "-"],
    ["Phone", p.phone ?? "-"],
    ["Audit score", p.audit_score != null ? `${p.audit_score}/100` : "-"],
    ["Lead score", p.lead_score != null ? `${p.lead_score}/100` : "-"],
    [
      "Report",
      audit ? (
        <a href={`/report/${audit.report_id}`} target="_blank" rel="noreferrer">
          /report/{audit.report_id} {Date.parse(audit.expires_at) < Date.now() ? "(expired)" : `(until ${formatDate(audit.expires_at, false)})`}
        </a>
      ) : (
        "-"
      ),
    ],
    ["Time zone", p.timezone],
    ...(p.skip_reason ? ([["Skipped because", p.skip_reason]] as [string, React.ReactNode][]) : []),
    ...(p.lead_id ? ([["Lead", <a key="l" href={`/admin/leads?lead=${p.lead_id}`}>Open lead</a>]] as [string, React.ReactNode][]) : []),
    ["Found", formatDate(p.created_at)],
  ];

  return (
    <div className="adm-panel-layer">
      <button type="button" className="adm-panel-backdrop" aria-label="Close prospect details" onClick={onClose} />
      <div className="adm-panel" role="dialog" aria-modal="true" aria-labelledby="ox-panel-title" ref={ref} tabIndex={-1}>
        <div className="adm-panel-head">
          <div>
            <h2 id="ox-panel-title">{p.name}</h2>
            <p>{PROSPECT_STATUS_LABELS[p.status]}</p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="adm-panel-body">
          <div className="adm-actions">
            {p.phone && (
              <a className="adm-btn is-whatsapp" href={whatsappLink(p.phone, p.country, messageFor(p))} target="_blank" rel="noreferrer">
                WhatsApp manually
              </a>
            )}
            <button type="button" className="adm-btn is-danger" disabled={pending} onClick={() => window.confirm("Record a spam complaint? This suppresses the address and pauses outreach.") && run(() => markComplaint(p.id))}>
              Mark as complaint
            </button>
          </div>
          {message && (
            <p className={message.error ? "adm-error" : "adm-saved"} role="status">
              {message.text}
            </p>
          )}
          <label className="adm-field">
            <span>Status</span>
            <select
              value={status}
              disabled={pending}
              onChange={(e) => {
                const next = e.target.value as ProspectStatus;
                if (next === "unsubscribed" && !window.confirm("Unsubscribe permanently? The address can never be emailed again.")) return;
                setStatus(next);
                run(() => updateProspectStatus(p.id, next));
              }}
            >
              {PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s} disabled={!MANUAL_PROSPECT_STATUSES.includes(s) && s !== p.status}>
                  {PROSPECT_STATUS_LABELS[s]}
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
          <label className="adm-field">
            <span>Notes (private)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={4000} />
          </label>
          <div className="adm-actions">
            <button type="button" className="adm-btn" disabled={pending} onClick={() => run(() => updateProspectNotes(p.id, notes))}>
              Save notes
            </button>
          </div>
          <h3 className="ox-thread-title">Email thread</h3>
          {thread === null ? (
            <p className="adm-muted">Loading…</p>
          ) : thread.length ? (
            <ol className="ox-thread">
              {thread.map((m) => (
                <li key={m.id} className={`is-${m.direction} is-${m.kind}`}>
                  <p className="ox-thread-meta">
                    {m.direction === "out" ? `${STEP[m.step ?? 0]} · ${m.status}` : m.kind} · {formatDate(m.sent_at ?? m.created_at)}
                    {m.error ? ` · ${m.error}` : ""}
                  </p>
                  <p className="ox-thread-subject">{m.subject}</p>
                  <pre className="ox-email">{m.body}</pre>
                </li>
              ))}
            </ol>
          ) : (
            <p className="adm-muted">No emails yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Prospect list with status filter and search; a row opens the side panel. */
const ProspectsBrowser = ({ prospects, initialId }: { prospects: ProspectRow[]; initialId: string | null }) => {
  const [filter, setFilter] = useState<"all" | ProspectStatus>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialId);
  const counts = useMemo(() => Object.fromEntries(PROSPECT_STATUSES.map((s) => [s, prospects.filter((p) => p.status === s).length])), [prospects]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return prospects
      .filter((p) => filter === "all" || p.status === filter)
      .filter((p) => !needle || `${p.name} ${p.city ?? ""} ${p.email ?? ""} ${p.website ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => (b.lead_score ?? -1) - (a.lead_score ?? -1) || b.created_at.localeCompare(a.created_at));
  }, [prospects, filter, q]);
  const open = prospects.find((p) => p.id === openId) ?? null;

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>
          Prospects <span className="adm-count">{prospects.length}</span>
        </h2>
      </div>
      <div className="adm-toolbar">
        <input className="adm-search" type="search" placeholder="Search name, city, email or website" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search prospects" />
        <select className="ox-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROSPECT_STATUS_LABELS[s]} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
      </div>
      {rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Email</th>
                <th scope="col">Audit</th>
                <th scope="col">Lead</th>
                <th scope="col">Status</th>
                <th scope="col">Found</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button type="button" className="adm-row-btn ox-row" onClick={() => setOpenId(p.id)}>
                      <strong>{p.name}</strong>
                      <span className="adm-muted">
                        {typeLabel(p.business_type)}
                        {p.city ? `, ${p.city}` : ""}
                        {p.website ? ` · ${p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}` : " · no website"}
                      </span>
                    </button>
                  </td>
                  <td className="adm-nowrap">{p.email ?? <span className="adm-muted">-</span>}</td>
                  <td>{p.audit_score ?? "-"}</td>
                  <td>{p.lead_score ?? "-"}</td>
                  <td>
                    <span className={`adm-badge ox-status is-${p.status}`} title={p.skip_reason ?? undefined}>
                      {PROSPECT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="adm-nowrap adm-muted">{formatDate(p.created_at, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="search" title="No prospects here" text="Add a saved search and run it, or change the filter." compact />
      )}
      {open && <Panel key={open.id} p={open} onClose={() => setOpenId(null)} />}
    </section>
  );
};

export default ProspectsBrowser;
