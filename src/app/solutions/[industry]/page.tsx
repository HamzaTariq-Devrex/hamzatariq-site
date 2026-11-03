import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import Section from "@/components/site/ds/Section";
import Faq from "@/components/site/ds/Faq";
import Icon, { type IconName } from "@/components/site/ds/Icon";
import OpenChat from "@/components/site/ds/OpenChat";
import WhereIWork from "@/components/site/WhereIWork";
import AuditCta from "@/components/site/AuditCta";
import { Laptop, Phone } from "@/components/site/ds/Mockups";
import { renderMdx } from "@/components/blog/mdx";
import { SERVICES, formatPrice } from "@/data/services";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { getSolution, getSolutions } from "@/lib/solutions";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Blog.css";
import "@/components/styles/Tools.css";

export const dynamicParams = false;
export const generateStaticParams = () => getSolutions().map((s) => ({ industry: s.slug }));

type Props = { params: Promise<{ industry: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getSolution((await params).industry);
  if (!s) return {};
  return {
    title: s.seoTitle,
    description: s.description,
    alternates: { canonical: `/solutions/${s.slug}` },
    openGraph: { title: s.seoTitle, description: s.description, url: `/solutions/${s.slug}` },
  };
}

export default async function SolutionPage({ params }: Props) {
  const s = getSolution((await params).industry);
  if (!s) notFound();
  const pageUrl = `${SITE.url}/solutions/${s.slug}`;
  const projects = s.projects.map((slug) => PROJECTS.find((p) => p.slug === slug)!);
  const content = await renderMdx(s.body);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Solutions", item: `${SITE.url}/solutions` },
          { "@type": "ListItem", position: 3, name: s.industry, item: pageUrl },
        ],
      },
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: s.title,
        description: s.description,
        url: pageUrl,
        provider: { "@id": `${SITE.url}/#person` },
        areaServed: "Worldwide",
        audience: { "@type": "BusinessAudience", name: s.industry },
      },
      { "@type": "FAQPage", mainEntity: s.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };

  return (
    <SiteShell cta={{ title: <>Let&apos;s plan your <span>{s.industry.toLowerCase()}</span> project.</>, text: "Tell me what you need on a free call. You'll get a clear plan, price and timeline afterwards." }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/solutions">Solutions</Link> <span aria-hidden="true">/</span> <span>{s.industry}</span>
      </nav>

      <section className="x-hero x-hero-center">
        <span className="x-label">For {s.industry.toLowerCase()}</span>
        <h1 className="x-h1">
          {s.h1} <span>{s.h1Accent}</span>
        </h1>
        <p className="x-hero-lead">{s.lead}</p>
        <div className="x-actions">
          <BookCall />
          <OpenChat className="page-btn page-btn-ghost">Ask my AI assistant</OpenChat>
        </div>
        <WhereIWork className="is-center" />
      </section>

      <Section label="The problem" title="What usually gets in the way">
        <div className="x-grid-4 sol-pains">
          {s.pains.map((p) => (
            <div key={p.title} className="x-card" data-reveal>
              <span className="x-card-icon is-sm">
                <Icon name="warning" size={18} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="What I'd build" title={<>The pieces that <span>fix it</span></>}>
        <div className="x-grid-4">
          {s.build.map((b) => {
            const service = SERVICES.find((x) => x.slug === b.service)!;
            return (
              <Link key={b.title} href={`/services/${service.slug}`} className="x-card" data-reveal>
                <span className="x-card-icon">
                  <Icon name={service.icon as IconName} />
                </span>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
                <span className="x-link">
                  {service.name} · from {formatPrice(service.pricing[0])} <Icon name="arrow" size={16} />
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section label="Example features" title="What it could include">
        <ul className="x-features sol-features">
          {s.features.map((f) => (
            <li key={f} className="x-card" data-reveal>
              <span className="x-card-icon is-sm">
                <Icon name="check" size={18} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Section>

      <section className="x-section">
        <article className="post-body sol-body" data-reveal>
          {content}
          <AuditCta location="solution" />
        </article>
      </section>

      {projects.length > 0 && (
        <Section label="Related work" title={`Built at ${SITE.agency.name}`}>
          <div className="x-work">
            {projects.map((p) => (
              <Link key={p.slug} href={`/work/${p.slug}`} className="x-work-item" data-reveal>
                <div className="x-work-visual">
                  <Laptop src={`${IMAGE_BASE}${p.image}`} alt={`${p.title}, desktop`} width={1440} height={1200} sizes="(max-width: 760px) 86vw, 380px" />
                  {p.mobileImage && (
                    <div className="x-work-phone">
                      <Phone src={`${IMAGE_BASE}${p.mobileImage}`} alt={`${p.title}, mobile`} width={780} height={2100} sizes="110px" />
                    </div>
                  )}
                </div>
                <span className="x-work-label">
                  {p.label} · Built at {SITE.agency.name}
                </span>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <span className="x-link">
                  See the project <Icon name="arrow" size={16} />
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section label="FAQ" title="Frequently asked questions">
        <Faq items={s.faq} />
      </Section>
    </SiteShell>
  );
}
