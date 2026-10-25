import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import OwnerTodo from "@/components/site/OwnerTodo";
import { SERVICES } from "@/data/services";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact Hamza Tariq: Book a Free Call",
  description:
    "Book a free call with Hamza Tariq about your Next.js website, dashboard, AI chatbot or React SEO project. Reach out by email or WhatsApp to get a clear quote.",
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
    <SiteShell active="contact" hideCta>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="page-hero">
        <span className="page-eyebrow">Contact</span>
        <h1>
          Let&apos;s talk about your <span>project</span>
        </h1>
        <p>
          Tell me what you want to build or fix. We&apos;ll go through it on a free call, and you&apos;ll get a clear
          quote afterwards.
        </p>
      </section>

      <section className="contact-grid" id="book">
        <div className="contact-book">
          <h2>Book a free call</h2>
          {SITE.bookingUrl ? (
            <iframe src={SITE.bookingUrl} title="Book a call with Hamza Tariq" className="contact-embed" loading="lazy" />
          ) : (
            <OwnerTodo what="Add the Cal.com booking link (SITE.bookingUrl). Until then visitors book by email or WhatsApp.">
              <p className="contact-fallback">
                Online booking is coming soon. Send me a message by email or WhatsApp and I&apos;ll set up a time
                that suits you.
              </p>
            </OwnerTodo>
          )}
        </div>

        <div className="contact-ways">
          <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Project enquiry")}`} className="svc-card svc-link">
            <h3>Email</h3>
            <p>{SITE.email}</p>
            <span>Send an email →</span>
          </a>
          <a href={SITE.social.whatsapp} target="_blank" rel="noreferrer" className="svc-card svc-link">
            <h3>WhatsApp</h3>
            <p>+92 305 4122637</p>
            <span>Start a chat →</span>
          </a>
        </div>
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
