import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import Faq from "@/components/site/ds/Faq";
import Icon from "@/components/site/ds/Icon";
import OpenChat from "@/components/site/ds/OpenChat";
import { GENERAL_FAQS, PRICE_NOTE, PROCESS, SERVICES, formatPrice } from "@/data/services";
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
    {
      "@type": "FAQPage",
      mainEntity: GENERAL_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function ServicesPage() {
  return (
    <SiteShell
      cta={{
        title: (
          <>
            Tell me what you need. I&apos;ll show you the <span>fastest way</span> to get it.
          </>
        ),
        text: "Book a free call and get a clear quote, a delivery date and the payment terms up front.",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />

      <section className="x-hero x-hero-center">
        <span className="x-label">Services</span>
        <h1 className="x-h1">
          Websites, dashboards and AI that <span>bring you customers</span>
        </h1>
        <p className="x-hero-lead">{SITE.positioning}</p>
      </section>

      <section className="x-bento" aria-label="Services">
        {SERVICES.map((s, i) => (
          <Link key={s.slug} href={`/services/${s.slug}`} className={`x-card x-bento-item${i === 0 ? " is-wide" : ""}`} data-reveal>
            <span className="x-card-icon is-lg">
              <Icon name={s.icon} size={26} />
            </span>
            <span className="x-label is-small">{s.eyebrow}</span>
            <h2>{s.name}</h2>
            <p>{s.summary}</p>
            <ul className="x-checks">
              {s.features.slice(0, 3).map((f) => (
                <li key={f}>
                  <Icon name="check" size={16} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="x-bento-foot">
              <span className="x-price">
                <small>From</small> {formatPrice(s.pricing[0])}
              </span>
              <span className="x-link">
                Learn more <Icon name="arrow" size={16} />
              </span>
            </div>
          </Link>
        ))}
      </section>
      <p className="svc-note">{PRICE_NOTE}</p>

      <section className="x-panel" data-reveal>
        <div>
          <span className="x-label">Not sure what you need?</span>
          <h2 className="x-h3">Ask my AI assistant, or tell me about your project</h2>
          <p>
            It answers questions about services, prices and timelines from this site in seconds. For anything else,
            send your details and I&apos;ll reply personally.
          </p>
        </div>
        <div className="x-actions">
          <OpenChat className="page-btn page-btn-primary">
            <Icon name="sparkle" size={18} /> Ask the AI assistant
          </OpenChat>
          <Link href="/contact" className="page-btn page-btn-ghost">
            Send project details
          </Link>
        </div>
      </section>

      <Section label="Process" title="How every project works" center>
        <ol className="x-steps">
          {PROCESS.map((p, i) => (
            <li key={p.title} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="x-step-icon">
                <Icon name={p.icon} />
              </span>
              <span className="x-step-num">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="FAQ" title="Questions before you start">
        <Faq items={GENERAL_FAQS} />
      </Section>
    </SiteShell>
  );
}
