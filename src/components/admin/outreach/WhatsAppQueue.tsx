"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProspectStatus } from "@/app/admin/(dashboard)/prospects/actions";
import { whatsappNumber } from "@/lib/outreach/whatsapp";
import { typeLabel } from "./prospect-shared";

export type QueueItem = {
  id: string;
  name: string;
  business_type: string;
  city: string | null;
  country: string;
  phone: string | null;
  instagram: string | null;
  audit_score: number | null;
  lead_score: number | null;
  /** 2-3 plain lines from the real audit: one problem, one question, no links. */
  message: string;
};

/**
 * Businesses with a phone or Instagram but no public email. Nothing is sent automatically: copy the
 * message or open WhatsApp/Instagram, send it yourself, then mark it sent.
 */
const WhatsAppQueue = ({ items }: { items: QueueItem[] }) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const mark = (id: string, status: "messaged" | "lost") =>
    start(async () => {
      setError("");
      const res = await updateProspectStatus(id, status);
      if (res.error) setError(res.error);
      router.refresh();
    });
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Could not copy. Select the message text instead.");
    }
  };

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>WhatsApp / Instagram queue</h2>
        <span className="adm-muted">No public email · you send these yourself</span>
      </div>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      {items.length ? (
        <ul className="ox-wa">
          {items.map((p) => (
            <li key={p.id}>
              <div className="ox-wa-main">
                <strong>{p.name}</strong>
                <span className="adm-muted">
                  {typeLabel(p.business_type)}
                  {p.city ? `, ${p.city}` : ""}
                  {p.phone ? ` · ${p.phone}` : ""}
                  {p.audit_score != null ? ` · audit ${p.audit_score}` : " · no website"}
                  {p.lead_score != null ? ` · lead ${p.lead_score}` : ""}
                </span>
                <p className="ox-wa-text">{p.message}</p>
              </div>
              <div className="ox-wa-actions">
                <button type="button" className="adm-btn" onClick={() => copy(p.id, p.message)}>
                  {copied === p.id ? "Copied ✓" : "Copy"}
                </button>
                {p.phone && (
                  <a className="adm-btn is-whatsapp" href={`https://wa.me/${whatsappNumber(p.phone, p.country)}?text=${encodeURIComponent(p.message)}`} target="_blank" rel="noreferrer">
                    Open WhatsApp
                  </a>
                )}
                {p.instagram && (
                  <a className="adm-btn" href={p.instagram} target="_blank" rel="noreferrer">
                    Open Instagram
                  </a>
                )}
                <button type="button" className="adm-btn is-primary" disabled={pending} onClick={() => mark(p.id, "messaged")}>
                  Mark as sent
                </button>
                <button type="button" className="adm-link-btn" disabled={pending} onClick={() => mark(p.id, "lost")}>
                  Not a fit
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-muted">Nothing to send. Businesses with a phone or Instagram but no public email appear here after their audit.</p>
      )}
    </section>
  );
};

export default WhatsAppQueue;
