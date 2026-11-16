import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { ox, type Preview } from "@/lib/outreach/db";
import { groupOf, nounFor, type NicheGroup } from "@/lib/outreach/osm-types";
import "@/components/styles/Preview.css";

// Homepage concept for a business with no website (owner, 2026-11-16). Only their public details
// from OpenStreetMap: name, niche, address, phone, opening hours. No invented reviews, prices,
// awards, photos of people or claims; no form that collects data; the only button is "Call".
// Private: noindex, not in the sitemap, an unguessable id, clearly labelled, expires after 30 days.
export const dynamic = "force-dynamic";

const ID = /^[a-f0-9]{24}$/;
const load = async (id: string) => (ID.test(id) ? ox.preview(id).catch(() => null) : null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  return {
    title: p ? `Homepage concept for ${p.name}` : "Homepage concept",
    description: "A homepage concept made by Devrex Digital from public details. Not the business's official website.",
    robots: { index: false, follow: false, nocache: true },
    alternates: { canonical: `/preview/${id}` },
  };
}

/** Placeholder blocks per niche: where their real content would go (labelled, never invented). */
const SLOTS: Record<NicheGroup, [string, string, string]> = {
  jewellery: ["Your collections", "Photos of your pieces", "Your story"],
  fashion: ["Your latest collection", "Photos of your shop", "Sizes and styles"],
  ecommerce: ["Your products", "Photos of your shop", "Delivery and returns"],
  clinic: ["Your treatments", "Your team", "How to book a visit"],
  restaurant: ["Your menu", "Photos of your food", "Your story"],
  salon: ["Your services and prices", "Photos of your work", "How to book"],
  realestate: ["Your listings", "Areas you cover", "How to reach you"],
  gym: ["Classes and timetable", "Membership options", "Photos of your space"],
  law: ["Your services", "Who you help", "How to reach you"],
  accounting: ["Your services", "Who you help", "How to reach you"],
  hotel: ["Your rooms", "Photos of your place", "Getting here"],
  auto: ["Your services", "Photos of the garage", "How to reach you"],
  home: ["Your services", "Areas you cover", "Photos of your work"],
  education: ["Your courses", "Your timetable", "How to enrol"],
  delivery: ["Your services", "Areas you cover", "How to send a parcel"],
};

const TONE: Partial<Record<NicheGroup, string>> = { clinic: "cyan", hotel: "cyan", restaurant: "blue", home: "blue", auto: "blue", delivery: "blue" };

const DAY: Record<string, string> = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun", PH: "Public holidays" };

/** OpenStreetMap opening_hours ("Mo-Fr 09:00-17:30; Sa 10:00-16:00") as readable lines. */
const hoursLines = (raw: string | undefined) => {
  if (!raw) return [];
  if (raw.trim() === "24/7") return ["Open 24 hours, every day"];
  return raw
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((r) => r.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAY[d]).replace(/\boff\b/i, "closed").replace(/,/g, ", "));
};

const address = (p: Preview) => {
  const t = p.tags;
  const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  return [street, t["addr:suburb"], t["addr:city"] ?? p.city, t["addr:postcode"]].filter(Boolean).join(", ");
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Find us, check our opening hours and call us in one tap." from the details we really have. */
const lead = (parts: (string | false | null | "")[]) => {
  const p = parts.filter(Boolean) as string[];
  if (!p.length) return "Everything about us, in one place.";
  const text = p.length === 1 ? p[0] : `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}`;
  return `${cap(text)}.`;
};

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await load(id);
  if (!p) notFound();

  const label = (
    <p className="pv-label" role="note">
      Homepage concept made by Devrex Digital for {p.name}. Not their official website.
    </p>
  );

  if (p.expired) {
    return (
      <div className="pv">
        {label}
        <main className="pv-expired">
          <h1>This homepage concept has expired</h1>
          <p>Concepts are kept for 30 days.</p>
        </main>
      </div>
    );
  }

  const group = groupOf(p.business_type) ?? "ecommerce";
  const noun = cap(nounFor(p.business_type, p.tags));
  const where = address(p);
  const hours = hoursLines(p.tags.opening_hours);
  const tel = p.phone ? `tel:${p.phone.replace(/[^\d+]/g, "")}` : null;
  const call = tel ? (
    <a className="pv-call" href={tel}>
      Call {p.phone}
    </a>
  ) : null;

  return (
    <div className="pv" data-tone={TONE[group] ?? "violet"}>
      {label}
      <header className="pv-top">
        <span className="pv-brand">{p.name}</span>
        {call}
      </header>
      <main>
        <section className="pv-hero">
          <span className="pv-eyebrow">
            {noun}
            {p.city ? ` · ${p.city}` : ""}
          </span>
          <h1>{p.name}</h1>
          <p className="pv-lead">{lead([where && "find us", hours.length > 0 && "check our opening hours", tel && "call us in one tap"])}</p>
          {call}
        </section>

        <section className="pv-info" aria-label="Details">
          {where && (
            <div className="pv-card">
              <h2>Find us</h2>
              <p>{where}</p>
            </div>
          )}
          {hours.length > 0 && (
            <div className="pv-card">
              <h2>Opening hours</h2>
              <ul>
                {hours.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          {p.phone && (
            <div className="pv-card">
              <h2>Call us</h2>
              <p>{p.phone}</p>
            </div>
          )}
        </section>

        <section className="pv-slots" aria-label="Space for your own content">
          <h2>Space for your own content</h2>
          <p className="pv-muted">In the real site, these hold your own photos and words.</p>
          <div className="pv-slot-grid">
            {SLOTS[group].map((s) => (
              <div key={s} className="pv-slot">
                <strong>{s}</strong>
                <span>goes here</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="pv-foot">
        <p>
          Concept by Devrex Digital ({new URL(SITE.url).host}), made only from public OpenStreetMap details. Available until{" "}
          {new Date(p.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </footer>
    </div>
  );
}
