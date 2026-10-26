import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import { SERVICES, PRICE_NOTE, formatPrice } from "@/data/services";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Services: Websites, Dashboards, AI and SEO",
  description:
    "Custom-coded Next.js websites, dashboards and web apps, AI chatbots and React SEO fixes by Hamza Tariq. See what each service includes and its starting price.",
  alternates: { canonical: "/services" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE.url}/services` },
      ],
    },
    {
      "@type": "ItemList",
      name: "Services by Hamza Tariq",
      itemListElement: SERVICES.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE.url}/services/${s.slug}`,
        name: s.name,
      })),
    },
  ],
};

export default function ServicesPage() {
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="page-hero">
        <span className="page-eyebrow">Services</span>
        <h1>
          What I <span>build</span>
        </h1>
        <p>{SITE.positioning}</p>
      </section>

      <div className="svc-index">
        {SERVICES.map((s, i) => (
          <Link key={s.slug} href={`/services/${s.slug}`} className="svc-index-item">
            <span className="svc-step">0{i + 1}</span>
            <div>
              <h2>{s.name}</h2>
              <p>{s.summary}</p>
              <ul>
                {s.pricing.map((t) => (
                  <li key={t.name}>
                    {t.name} <strong>from {formatPrice(t)}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <span className="svc-index-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
      <p className="svc-note">{PRICE_NOTE}</p>
      <div className="project-actions">
        <BookCall />
      </div>
    </SiteShell>
  );
}
