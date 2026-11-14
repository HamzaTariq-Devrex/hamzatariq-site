import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import LeadForm from "@/components/assistant/LeadForm";
import { SERVICES } from "@/data/services";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import WhereIWork from "@/components/site/WhereIWork";

export const metadata: Metadata = {
  title: "Contact Hamza Tariq: Chat on WhatsApp",
  description:
    "Chat with Hamza Tariq on WhatsApp about your Next.js website, dashboard, AI chatbot or React SEO project, or send the details by form or email for a clear quote.",
  alternates: { canonical: "/contact" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Contact", item: `${SITE.url}/contact` },
      ],
    },
    {
      "@type": "ContactPage",
      url: `${SITE.url}/contact`,
      mainEntity: { "@id": `${SITE.url}/#person` },
    },
  ],
};

export default function ContactPage() {
  return (
    <SiteShell hideCta>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="page-hero">
        <span className="page-eyebrow">Contact</span>
        <h1>
          Let&apos;s talk about your <span>project</span>
        </h1>
        <p>
          Tell me what you want to build or fix. We&apos;ll go through it on WhatsApp, and you&apos;ll get a clear
          quote afterwards.
        </p>
        <WhereIWork className="is-center" />
      </section>

      <section className="contact-whatsapp" id="whatsapp" aria-labelledby="whatsapp-title">
        <h2 id="whatsapp-title">Chat on WhatsApp</h2>
        <p>The fastest way to reach me. Your first message is already written, just press send.</p>
        <div className="contact-whatsapp-row">
          <BookCall />
          <span className="contact-whatsapp-number">{SITE.whatsappDisplay}</span>
        </div>
      </section>

      <section className="contact-form" id="project-form" aria-labelledby="project-form-title">
        <h2 id="project-form-title">Or send your project details</h2>
        <p>Takes a minute. I&apos;ll reply by email within 24 hours.</p>
        <LeadForm source="form" />
      </section>

      <section className="contact-ways" id="email" aria-label="Email">
        <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Project enquiry")}`} className="svc-card svc-link">
          <h3>Email</h3>
          <p>{SITE.email}</p>
          <span>Send an email →</span>
        </a>
      </section>

      <section className="svc-section">
        <h2>Helpful to include</h2>
        <ul className="cs-list">
          <li>What you want built or fixed, and a link to your current site if you have one.</li>
          <li>The features that matter most to you.</li>
          <li>Your budget range and when you would like to launch.</li>
        </ul>
      </section>

      <section className="svc-section">
        <h2>Services</h2>
        <div className="svc-others is-four">
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="svc-card svc-link">
              <h3>{s.name}</h3>
              <p>{s.summary}</p>
              <span>Learn more →</span>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
