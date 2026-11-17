import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ox } from "@/lib/outreach/db";
import { groupOf, nounFor } from "@/lib/outreach/osm-types";
import { EXAMPLES, addressLine, directionsUrl, hoursRows, telUrl, templateFor, whatsappUrl, type Example } from "@/lib/outreach/preview-templates";
import { contentService } from "@/lib/outreach/compose";
import "@/components/styles/Preview.css";

// Homepage concept for a business with no website (owner, 2026-11-16). A premium one-page design
// per niche family, filled only with public OpenStreetMap facts (name, niche, address, phone,
// opening hours, WhatsApp when listed). Everything else is an "Example section" with empty cards.
// No invented reviews, prices, services, awards, photos of people or claims; no forms; no site
// header or name of ours (only the concept label and the small footer). Private: noindex, not in
// the sitemap, an unguessable id, expires after 30 days.
export const dynamic = "force-dynamic";

const ID = /^[a-f0-9]{24}$/;
const load = async (id: string) => (ID.test(id) ? ox.preview(id).catch(() => null) : null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  return {
    // Absolute: no "| Hamza Tariq" suffix, no site name in the tab.
    title: { absolute: p ? `${p.name} · homepage concept` : "Homepage concept" },
    description: "A homepage concept made from public details. Not the business's official website.",
    applicationName: "Homepage concept",
    authors: [{ name: "Devrex Digital" }],
    creator: "Devrex Digital",
    robots: { index: false, follow: false, nocache: true },
    alternates: { canonical: `/preview/${id}` },
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Visit us, check our opening hours and call us in one tap." from the facts we really have. */
const lead = (parts: (string | false | null | "")[]) => {
  const p = parts.filter(Boolean) as string[];
  if (!p.length) return "Everything you need to find us, in one place.";
  return `${cap(p.length === 1 ? p[0] : `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}`)}.`;
};

const Icon = ({ name }: { name: "phone" | "pin" | "clock" | "chat" | "arrow" }) => {
  const d = {
    phone: "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z",
    pin: "M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z",
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.2 1.9-.8 1.3L11 13V7h2z",
    chat: "M12 2a10 10 0 0 0-8.7 15l-1.3 5 5.1-1.3A10 10 0 1 0 12 2zm5 13.6c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .2-3.3-.7a11 11 0 0 1-4.4-3.9c-.3-.5-1-1.5-1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z",
    arrow: "M13 5l7 7-7 7-1.4-1.4 4.6-4.6H4v-2h12.2l-4.6-4.6z",
  }[name];
  return (
    <svg className="pv-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  );
};

const ExampleSection = ({ ex, i }: { ex: Example; i: number }) => (
  <section className={`pv-ex is-${ex.kind}${i % 2 ? " is-alt" : ""}`} aria-label={`Example section: ${ex.title}`}>
    <div className="pv-wrap">
      <h2 className="pv-h2">
        <span className="pv-ex-tag">Example section:</span> {ex.title}
      </h2>
      {ex.kind === "cards" && (
        <div className="pv-cards">
          {ex.items.map((t, n) => (
            <figure key={n} className="pv-frame">
              <span className="pv-frame-art" aria-hidden="true" />
              <figcaption>{t}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {ex.kind === "list" && (
        <ul className="pv-list">
          {ex.items.map((t, n) => (
            <li key={n}>
              <span>{t}</span>
              <span className="pv-leader" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
      {ex.kind === "text" && (
        <div className="pv-textblock">
          <p>{ex.items[0]}</p>
          <span className="pv-bar" aria-hidden="true" />
          <span className="pv-bar is-short" aria-hidden="true" />
        </div>
      )}
      {ex.kind === "people" && (
        <div className="pv-people">
          {ex.items.map((t, n) => (
            <figure key={n}>
              <span className="pv-avatar" aria-hidden="true" />
              <figcaption>{t}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {ex.kind === "week" && (
        <div className="pv-week">
          <div className="pv-week-grid" aria-hidden="true">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>
                <strong>{d}</strong>
                <span />
                <span />
              </div>
            ))}
          </div>
          <p className="pv-muted">{ex.items[0]}</p>
        </div>
      )}
    </div>
  </section>
);

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  // Local and preview builds only: ?t=<template> shows the same facts in another template (design checks).
  const forced = process.env.VERCEL_ENV !== "production" ? (await searchParams).t : undefined;
  const p = await load(id);
  if (!p) notFound();

  const label = (
    <p className="pv-label" role="note">
      Homepage concept made by Devrex Digital for {p.name}. Not their official website.
    </p>
  );

  if (p.expired) {
    return (
      <div className="pv" data-t="generic">
        {label}
        <main className="pv-expired">
          <h1 className="pv-h2">This homepage concept has expired</h1>
          <p className="pv-muted">Concepts are kept for 30 days.</p>
        </main>
      </div>
    );
  }

  const t = forced && forced in EXAMPLES ? (forced as keyof typeof EXAMPLES) : templateFor(groupOf(p.business_type));
  const noun = cap(nounFor(p.business_type, p.tags));
  const where = addressLine(p.tags, p.city);
  const hours = hoursRows(p.tags.opening_hours);
  const tel = telUrl(p.phone);
  const wa = whatsappUrl(p.tags, p.country);
  const maps = where || p.city ? directionsUrl(p.name, where, p.city) : null;
  const expires = new Date(p.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  // Owner, 2026-11-18: demo pages mention the Monthly SEO + content service (real tier and price).
  const service = contentService();

  return (
    <div className="pv" data-t={t}>
      {label}
      <header className="pv-nav">
        <div className="pv-wrap pv-nav-in">
          <span className="pv-wordmark">{p.name}</span>
          {tel && (
            <a className="pv-btn is-small" href={tel}>
              <Icon name="phone" /> Call
            </a>
          )}
        </div>
      </header>

      <main>
        <section className="pv-hero">
          <div className="pv-art" aria-hidden="true">
            <span className="pv-art-a" />
            <span className="pv-art-b" />
            <span className="pv-art-c" />
          </div>
          <div className="pv-wrap pv-hero-in">
            <p className="pv-eyebrow">
              {noun}
              {p.city ? ` in ${p.city}` : ""}
            </p>
            <h1 className="pv-h1">{p.name}</h1>
            <p className="pv-lead">{lead([where && "visit us", hours.length > 0 && "check our opening hours", tel && "call us in one tap"])}</p>
            <div className="pv-actions">
              {tel && (
                <a className="pv-btn" href={tel}>
                  <Icon name="phone" /> Call {p.phone}
                </a>
              )}
              {maps && (
                <a className="pv-btn is-ghost" href={maps} target="_blank" rel="noopener noreferrer">
                  <Icon name="pin" /> Get directions
                </a>
              )}
              {wa && (
                <a className="pv-btn is-ghost" href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon name="chat" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </section>

        {EXAMPLES[t].map((ex, i) => (
          <ExampleSection key={ex.title} ex={ex} i={i} />
        ))}

        <section className="pv-visit" aria-label="Visit">
          <div className="pv-wrap pv-visit-in">
            <div className="pv-map" aria-hidden="true">
              <span className="pv-map-pin">
                <Icon name="pin" />
              </span>
            </div>
            <div className="pv-visit-text">
              <h2 className="pv-h2">Visit {p.name}</h2>
              {where && (
                <p className="pv-fact">
                  <Icon name="pin" /> {where}
                </p>
              )}
              {p.phone && (
                <p className="pv-fact">
                  <Icon name="phone" /> {p.phone}
                </p>
              )}
              {hours.length > 0 && (
                <div className="pv-hours">
                  <p className="pv-fact">
                    <Icon name="clock" /> Opening hours
                  </p>
                  <table>
                    <tbody>
                      {hours.map(([d, h], n) => (
                        <tr key={n}>
                          <th scope="row">{d}</th>
                          <td>{h}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {maps && (
                <a className="pv-link" href={maps} target="_blank" rel="noopener noreferrer">
                  Get directions <Icon name="arrow" />
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="pv-foot">
        <p>
          Homepage concept by Devrex Digital, made only from public OpenStreetMap details. Not the official website of {p.name}. Available until {expires}.
        </p>
        {service && (
          <p>
            Devrex Digital also offers {service.name} ({service.price}): new posts every month on what customers search for, to keep a site like this bringing in visitors.
          </p>
        )}
      </footer>

      {(tel || wa) && (
        <div className="pv-sticky">
          {tel && (
            <a className="pv-btn" href={tel}>
              <Icon name="phone" /> Call
            </a>
          )}
          {wa && (
            <a className="pv-btn is-ghost" href={wa} target="_blank" rel="noopener noreferrer">
              <Icon name="chat" /> WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
