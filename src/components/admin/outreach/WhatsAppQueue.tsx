"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProspectStatus } from "@/app/admin/(dashboard)/prospects/actions";
import { whatsappLink } from "@/lib/outreach/whatsapp";
import { latestAudit, messageFor, typeLabel, type ProspectRow } from "./ProspectsBrowser";

/**
 * Businesses with a phone but no public email. Nothing is sent automatically: "Open WhatsApp"
 * opens the chat with a prefilled personal message, Hamza edits and sends it, then marks it sent.
 */
const WhatsAppQueue = ({ prospects }: { prospects: ProspectRow[] }) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const mark = (id: string, status: "messaged" | "lost") =>
    start(async () => {
      setError("");
      const res = await updateProspectStatus(id, status);
      if (res.error) setError(res.error);
      router.refresh();
    });

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>
          WhatsApp manually <span className="adm-count">{prospects.length}</span>
        </h2>
        <span className="adm-muted">Phone but no public email · you send these yourself</span>
      </div>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      {prospects.length ? (
        <ul className="ox-wa">
          {prospects.map((p) => {
            const a = latestAudit(p);
            return (
              <li key={p.id}>
                <div className="ox-wa-main">
                  <strong>{p.name}</strong>
                  <span className="adm-muted">
                    {typeLabel(p.business_type)}
                    {p.city ? `, ${p.city}` : ""} · {p.phone}
                    {p.audit_score != null ? ` · audit ${p.audit_score}` : " · no website"}
                    {p.lead_score != null ? ` · lead ${p.lead_score}` : ""}
                    {a ? (
                      <>
                        {" · "}
                        <a href={`/report/${a.report_id}`} target="_blank" rel="noreferrer">
                          report
                        </a>
                      </>
                    ) : null}
                  </span>
                  <p className="ox-wa-text">{messageFor(p)}</p>
                </div>
                <div className="ox-wa-actions">
                  <a
                    className="adm-btn is-whatsapp"
                    href={whatsappLink(p.phone ?? "", p.country, messageFor(p))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpened((s) => new Set(s).add(p.id))}
                  >
                    Open WhatsApp
                  </a>
                  <button type="button" className={`adm-btn${opened.has(p.id) ? " is-primary" : ""}`} disabled={pending} onClick={() => mark(p.id, "messaged")}>
                    Mark as sent
                  </button>
                  <button type="button" className="adm-link-btn" disabled={pending} onClick={() => mark(p.id, "lost")}>
                    Not a fit
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="adm-muted">Nothing to send. Businesses with a phone but no public email appear here after their audit.</p>
      )}
    </section>
  );
};

export default WhatsAppQueue;
