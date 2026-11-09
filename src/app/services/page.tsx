import type { Metadata } from "next";
import ServiceBento from "@/components/site/ServiceBento";
import Timeline from "@/components/ui/Timeline";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import Faq from "@/components/site/ds/Faq";
import Icon from "@/components/site/ds/Icon";
import OpenChat from "@/components/site/ds/OpenChat";
import { GENERAL_FAQS, PRICE_NOTE, PROCESS, SERVICES } from "@/data/services";
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

      <section className="x-section svc-bento" aria-label="Services">
        <ServiceBento />
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

      <Section label="Process" title="How every project works">
        <Timeline data={PROCESS.map((p, i) => ({ kicker: String(i + 1).padStart(2, "0"), title: p.title, content: <p>{p.text}</p> }))} />
      </Section>

      <Section label="FAQ" title="Questions before you start">
        <Faq items={GENERAL_FAQS} />
      </Section>
    </SiteShell>
  );
}
