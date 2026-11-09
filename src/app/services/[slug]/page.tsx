import type { Metadata } from "next";
import Timeline from "@/components/ui/Timeline";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import AuthorBox from "@/components/site/AuthorBox";
import AuditCta from "@/components/site/AuditCta";
import ReviewStrip from "@/components/site/ReviewStrip";
import OwnerTodo from "@/components/site/OwnerTodo";
import Section from "@/components/site/ds/Section";
import Faq from "@/components/site/ds/Faq";
import Icon, { type IconName } from "@/components/site/ds/Icon";
import HeroVisual from "@/components/site/ds/HeroVisual";
import { Laptop, Phone } from "@/components/site/ds/Mockups";
import { SERVICES, PRICE_NOTE, PROJECT_TERMS, formatPrice, getService } from "@/data/services";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { CASE_STUDIES } from "@/data/caseStudies";
import { SITE, isProductionSite } from "@/lib/site";
import { reviewsForPage } from "@/lib/testimonials";
import { fitDescription, jsonLd } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

const sentences = (text: string) => (text.match(/[^.!?]+[.!?]+/g) ?? [text]).map((s) => s.trim());

const describe = (slug: string) => {
  const s = getService(slug)!;
  const from = Math.min(...s.pricing.map((p) => p.price));
  return fitDescription([...sentences(s.lead), `Starting from $${from.toLocaleString("en-US")}.`, s.summary]);
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  const description = describe(slug);
  return {
    title: service.metaTitle,
    description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: { title: service.metaTitle, description, url: `/services/${service.slug}` },
  };
}

const TERM_ICONS: IconName[] = ["tag", "repeat", "shield"];

// Bento of features in 3 columns: widen the first (and last) card only when that fills the last row.
const isWideFeature = (i: number, count: number) =>
  (count % 3 === 2 && i === 0) || (count % 3 === 1 && (i === 0 || i === count - 1));

type WorkItem = {
  href: string;
  title: string;
  label: string;
  text: string;
  desktop: { src: string; width: number; height: number };
  mobile: { src: string; width: number; height: number } | null;
  cta: string;
};

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const pageUrl = `${SITE.url}/services/${service.slug}`;
  const projects = service.relatedProjects
    .map((s) => PROJECTS.find((p) => p.slug === s))
    .filter((p) => p !== undefined);
  const caseStudies = service.relatedProjects
    .map((s) => CASE_STUDIES.find((c) => c.slug === s))
    .filter((c) => c !== undefined);
  const hasRelated = projects.length + caseStudies.length > 0;

  // Real screenshots: case study images, and the desktop/mobile shots from the portfolio.
  const work: WorkItem[] = [
    ...caseStudies.map((c) => ({
      href: `/work/${c.slug}`,
      title: c.title,
      label: c.label,
      text: c.headline,
      desktop: c.images[0],
      mobile: c.images.find((i) => i.mobile) ?? null,
      cta: "Read the case study",
    })),
    ...projects.map((p) => ({
      href: `/work/${p.slug}`,
      title: p.title,
      label: `${p.label} · Built at ${SITE.agency.name}`,
      text: p.description,
      desktop: { src: `${IMAGE_BASE}${p.image}`, width: 1440, height: 1200 },
      mobile: p.mobileImage ? { src: `${IMAGE_BASE}${p.mobileImage}`, width: 780, height: 2100 } : null,
      cta: "See the project",
    })),
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Services", item: `${SITE.url}/services` },
          { "@type": "ListItem", position: 3, name: service.name, item: pageUrl },
        ],
      },
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: service.name,
        serviceType: service.keyword,
        description: service.lead,
        url: pageUrl,
        provider: { "@id": `${SITE.url}/#person` },
        offers: {
          "@type": "OfferCatalog",
          name: `${service.name} pricing`,
          itemListElement: service.pricing.map((tier) => ({
            "@type": "Offer",
            name: tier.name,
            ...(tier.detail ? { description: tier.detail } : {}),
            priceSpecification: {
              "@type": tier.unit ? "UnitPriceSpecification" : "PriceSpecification",
              minPrice: tier.price,
              priceCurrency: "USD",
              ...(tier.unit ? { unitText: "MONTH" } : {}),
            },
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: service.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <SiteShell
      stickyCta
      cta={{
        title: (
          <>
            Ready to start your <span>{service.name}</span> project?
          </>
        ),
        text: "Book a free call. You'll get a clear quote, a delivery date and the payment terms up front.",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/services">Services</Link>
        <span>/</span>
        <span aria-current="page">{service.name}</span>
      </nav>

      <section className="x-hero x-svc-hero">
        <div className="x-hero-text">
          <span className="x-label">{service.eyebrow}</span>
          <h1 className="x-h1">
            {service.h1} <span>{service.h1Accent}</span>
          </h1>
          <p className="x-hero-lead">{service.lead}</p>
          <div className="x-actions">
            <BookCall />
            <a href="#pricing" className="page-btn page-btn-ghost">
              See pricing
            </a>
          </div>
          <p className="x-trust">
            <Icon name="shield" size={16} /> Built at {SITE.agency.name} for 45+ brands · Custom code, no templates
          </p>
        </div>
        <HeroVisual slug={service.slug} />
      </section>

      <Section label="The problem" title="Problems I solve">
        <div className="x-grid-4">
          {service.problems.map((p) => (
            <div key={p.title} className="x-card" data-reveal>
              <span className="x-card-icon">
                <Icon name={p.icon} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="What you get" title="Everything included">
        <ul className="x-features">
          {service.features.map((f, i) => (
            <li key={f} className={`x-card${isWideFeature(i, service.features.length) ? " is-wide" : ""}`} data-reveal>
              <span className="x-card-icon is-sm">
                <Icon name="check" size={18} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="pricing" label="Pricing" title="Clear starting prices" text={PRICE_NOTE}>
        <div className={`x-pricing is-${service.pricing.length}`}>
          {service.pricing.map((tier) => (
            <div key={tier.name} className={`x-price-card${tier.popular ? " is-popular" : ""}`} data-reveal>
              {tier.popular && <span className="x-popular">Most popular</span>}
              <h3>{tier.name}</h3>
              {tier.detail && <p className="x-price-detail">{tier.detail}</p>}
              <p className="x-price-value">
                <small>From</small>
                {formatPrice(tier)}
              </p>
              <p className="x-price-time">
                <Icon name="rocket" size={15} />
                {tier.timeline ? `Delivery: ${tier.timeline}` : "Timeline agreed on the call"}
              </p>
              <BookCall label="Get a quote" variant={tier.popular ? "primary" : "ghost"} className="x-price-cta" />
            </div>
          ))}
        </div>
        <ul className="x-terms" data-reveal>
          {PROJECT_TERMS.map((t, i) => (
            <li key={t.label}>
              <span className="x-card-icon is-sm">
                <Icon name={TERM_ICONS[i] ?? "check"} size={18} />
              </span>
              <div>
                <strong>{t.label}</strong>
                <p>{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Process" title="How it works">
        <Timeline data={service.process.map((step, i) => ({ kicker: String(i + 1).padStart(2, "0"), title: step.title, content: <p>{step.text}</p> }))} />
      </Section>

      {(hasRelated || !isProductionSite) && (
        <Section label="Related work" title="Projects like this">
          {hasRelated ? (
            <div className="x-work">
              {work.map((w) => (
                <Link key={w.href} href={w.href} className="x-work-item" data-reveal>
                  <div className="x-work-visual">
                    <Laptop src={w.desktop.src} alt={`${w.title}, desktop`} width={w.desktop.width} height={w.desktop.height} sizes="(max-width: 760px) 86vw, 380px" />
                    {w.mobile && (
                      <div className="x-work-phone">
                        <Phone src={w.mobile.src} alt={`${w.title}, mobile`} width={w.mobile.width} height={w.mobile.height} sizes="110px" />
                      </div>
                    )}
                  </div>
                  <span className="x-work-label">{w.label}</span>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                  <span className="x-link">
                    {w.cta} <Icon name="arrow" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <OwnerTodo what={`Add a case study for ${service.name}. This section is hidden on the live site until one exists.`} />
          )}
        </Section>
      )}

      <ReviewStrip
        reviews={reviewsForPage(`service:${service.slug}`)}
        title={
          <>
            What store owners <span>say</span>
          </>
        }
        text="Fashion and ecommerce brands that reviewed their new website on Instagram. Word for word."
      />

      <section className="x-section">
        <AuditCta location="service" heading />
      </section>

      <AuthorBox />

      <Section label="FAQ" title="Frequently asked questions">
        <Faq items={service.faqs} />
      </Section>

      <Section label="More services" title="Other ways I can help">
        <div className="x-service-links" data-reveal>
          {SERVICES.filter((o) => o.slug !== service.slug).map((o) => (
            <Link key={o.slug} href={`/services/${o.slug}`}>
              <Icon name={o.icon} size={18} />
              {o.name}
              <small>from {formatPrice(o.pricing[0])}</small>
            </Link>
          ))}
        </div>
      </Section>
    </SiteShell>
  );
}
