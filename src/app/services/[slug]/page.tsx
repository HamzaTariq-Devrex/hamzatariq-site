import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import AuthorBox from "@/components/site/AuthorBox";
import OwnerTodo from "@/components/site/OwnerTodo";
import ProjectCard from "@/components/ProjectCard";
import CaseStudyCard from "@/components/site/CaseStudyCard";
import { SERVICES, PRICE_NOTE, PROJECT_TERMS, formatPrice, getService } from "@/data/services";
import { PROJECTS } from "@/data/projects";
import { CASE_STUDIES } from "@/data/caseStudies";
import { SITE, isProductionSite } from "@/lib/site";
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

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

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
  const proof = caseStudies[0];

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
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/services">Services</Link>
        <span>/</span>
        <span aria-current="page">{service.name}</span>
      </nav>

      <section className="svc-hero">
        <span className="page-eyebrow">{service.eyebrow}</span>
        <h1>
          {service.h1} <span>{service.h1Accent}</span>
        </h1>
        <p>{service.lead}</p>
        <div className="project-actions">
          <BookCall />
          <a href="#pricing" className="page-btn page-btn-ghost">
            See pricing
          </a>
        </div>
        <p className="svc-trust">Built at {SITE.agency.name} for 45+ brands · Custom code, no templates</p>
      </section>

      {proof && (
        <section className="svc-proof" aria-label={`Results from ${proof.title}`}>
          {proof.results.slice(0, 2).map((r) => (
            <div key={r.label}>
              <span className="svc-proof-value">
                {r.before} <em>→</em> {r.after}
              </span>
              <span className="svc-proof-label">{r.label}</span>
            </div>
          ))}
          <Link href={`/work/${proof.slug}`} className="svc-proof-link">
            Read the {proof.title} case study →
          </Link>
        </section>
      )}

      <section className="svc-section">
        <h2>Problems I solve</h2>
        <div className="svc-problems">
          {service.problems.map((p) => (
            <div key={p.title} className="svc-card">
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="svc-section">
        <h2>How it works</h2>
        <ol className="svc-process">
          {service.process.map((step, i) => (
            <li key={step.title}>
              <span className="svc-step">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="svc-section svc-split">
        <h2>What you get</h2>
        <ul className="svc-features">
          {service.features.map((f) => (
            <li key={f}>
              <Check />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="svc-section" id="pricing">
        <h2>Pricing</h2>
        <div className="svc-pricing">
          {service.pricing.map((tier) => (
            <div key={tier.name} className="svc-price">
              <div>
                <h3>{tier.name}</h3>
                {tier.detail && <p>{tier.detail}</p>}
                {tier.timeline && <p className="svc-price-time">Delivery: {tier.timeline}</p>}
              </div>
              <div className="svc-price-value">
                <span>Starting from</span>
                <strong>{formatPrice(tier)}</strong>
              </div>
            </div>
          ))}
        </div>
        <p className="svc-note">{PRICE_NOTE}</p>
        <dl className="svc-terms">
          {PROJECT_TERMS.map((t) => (
            <div key={t.label}>
              <dt>{t.label}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
        <div className="project-actions">
          <BookCall label="Get a quote on a free call" />
        </div>
      </section>

      {(hasRelated || !isProductionSite) && (
        <section className="svc-section">
          <h2>Related work</h2>
          {hasRelated ? (
            <div className="project-grid is-static">
              {caseStudies.map((c) => (
                <CaseStudyCard key={c.slug} study={c} />
              ))}
              {projects.map((p, i) => (
                <ProjectCard key={p.slug} project={p} index={i} />
              ))}
            </div>
          ) : (
            <OwnerTodo what={`Add a case study for ${service.name}. This section is hidden on the live site until one exists.`} />
          )}
        </section>
      )}

      <AuthorBox />

      <section className="svc-section">
        <h2>Frequently asked questions</h2>
        <div className="svc-faq">
          {service.faqs.map((f) => (
            <details key={f.q}>
              <summary>
                <h3>{f.q}</h3>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="svc-section">
        <h2>Other services</h2>
        <div className="svc-others">
          {SERVICES.filter((s) => s.slug !== service.slug).map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="svc-card svc-link">
              <h3>{s.name}</h3>
              <p>{s.summary}</p>
              <span>From {formatPrice(s.pricing[0])} →</span>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
