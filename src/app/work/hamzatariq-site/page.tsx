import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import { getCaseStudy } from "@/data/caseStudies";
import { getService } from "@/data/services";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

const study = getCaseStudy("hamzatariq-site")!;
const pageUrl = `${SITE.url}/work/${study.slug}`;

export const metadata: Metadata = {
  title: "Case Study: React to Next.js SEO Migration",
  description:
    "How I migrated my portfolio from Vite and React to Next.js 15: mobile SEO score 83 to 100, home load time 18 s to 2.6 s, and every page now pre-rendered.",
  alternates: { canonical: `/work/${study.slug}` },
  openGraph: { type: "article", url: `/work/${study.slug}` },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Work", item: `${SITE.url}/work` },
        { "@type": "ListItem", position: 3, name: study.title, item: pageUrl },
      ],
    },
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      headline: study.headline,
      description: study.summary,
      url: pageUrl,
      image: `${SITE.url}${study.images[0].src}`,
      datePublished: "2026-10-22",
      author: { "@id": `${SITE.url}/#person` },
      about: { "@type": "WebSite", name: study.title, url: study.url },
    },
  ],
};

export default function HamzatariqSiteCaseStudy() {
  const [desktop, mobile, project] = study.images;
  return (
    <SiteShell active="work">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/work">Work</Link>
        <span>/</span>
        <span aria-current="page">{study.title}</span>
      </nav>

      <section className="svc-hero">
        <span className="page-eyebrow">{study.label}</span>
        <h1>{study.headline}</h1>
        <p>{study.summary}</p>
        <div className="project-actions">
          <Link href="/services/react-nextjs-seo" className="page-btn page-btn-primary">
            Get the same for your site
          </Link>
          <a href={study.url} className="page-btn page-btn-ghost">
            Visit {study.domain}
          </a>
        </div>
      </section>

      <section className="cs-results" aria-label="Results">
        {study.results.map((r) => (
          <div key={r.label} className="cs-result">
            <span className="cs-result-label">{r.label}</span>
            <span className="cs-result-value">
              <s>{r.before}</s> <em>→</em> <strong>{r.after}</strong>
            </span>
          </div>
        ))}
        <p className="cs-results-note">Mobile Lighthouse, measured on a production build before and after the migration.</p>
      </section>

      <section className="project-showcase">
        <figure className="project-browser">
          <div className="project-browser-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <em>{study.domain}</em>
          </div>
          <Image src={desktop.src} alt={desktop.alt} width={desktop.width} height={desktop.height} sizes="(max-width: 760px) 100vw, 900px" priority />
        </figure>
        <figure className="project-phone">
          <Image src={mobile.src} alt={mobile.alt} width={mobile.width} height={mobile.height} sizes="(max-width: 760px) 62vw, 260px" />
        </figure>
      </section>

      <section className="svc-section cs-columns">
        <div>
          <h2>The client</h2>
          <p>{study.client}</p>
          <h2>The problem</h2>
          <ul className="cs-list">
            {study.problem.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>What I did</h2>
          <ul className="cs-list">
            {study.solution.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="project-showcase no-mobile">
        <figure className="project-browser">
          <div className="project-browser-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <em>{study.domain}/work/dulhahouse</em>
          </div>
          <Image src={project.src} alt={project.alt} width={project.width} height={project.height} sizes="(max-width: 760px) 100vw, 1200px" />
        </figure>
      </section>

      <section className="project-features">
        <h2>What&apos;s on the site</h2>
        <ul>
          {study.features.map((f) => (
            <li key={f}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="svc-section">
        <h2>Stack</h2>
        <ul className="about-chips">
          {study.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="svc-section">
        <h2>Services used</h2>
        <div className="svc-others">
          {study.services.map((slug) => {
            const s = getService(slug)!;
            return (
              <Link key={slug} href={`/services/${slug}`} className="svc-card svc-link">
                <h3>{s.name}</h3>
                <p>{s.summary}</p>
                <span>Learn more →</span>
              </Link>
            );
          })}
        </div>
        <div className="project-actions">
          <BookCall />
        </div>
      </section>
    </SiteShell>
  );
}
