import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import { SERVICES, formatPrice } from "@/data/services";
import { EDUCATION, JOBS } from "@/data/experience";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Hamza Tariq, React and Next.js Developer",
  description:
    "Hamza Tariq is a React and Next.js developer and founder of Devrex Digital, building custom-coded websites, dashboards and AI chatbots for 45+ brands.",
  alternates: { canonical: "/about" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE.url}/about` },
      ],
    },
    {
      "@type": "AboutPage",
      url: `${SITE.url}/about`,
      mainEntity: { "@id": `${SITE.url}/#person` },
    },
  ],
};

export default function AboutPage() {
  return (
    <SiteShell active="about">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="about-hero">
        <div className="about-hero-text">
          <span className="page-eyebrow">About</span>
          <h1>
            Hi, I&apos;m <span>Hamza Tariq</span>
          </h1>
          <p className="about-positioning">{SITE.positioning}</p>
          <p>{SITE.bio}</p>
          <div className="project-actions">
            <BookCall />
            <Link href="/work" className="page-btn page-btn-ghost">
              See my work
            </Link>
          </div>
        </div>
        <Image
          src={SITE.photo.src}
          alt={SITE.photo.alt}
          width={SITE.photo.width}
          height={SITE.photo.height}
          sizes="(max-width: 1000px) 80vw, 420px"
          className="about-photo"
          priority
        />
      </section>

      <section className="svc-section">
        <h2>What I do</h2>
        <div className="svc-others is-four">
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="svc-card svc-link">
              <h3>{s.name}</h3>
              <p>{s.summary}</p>
              <span>From {formatPrice(s.pricing[0])} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="svc-section">
        <h2>Experience</h2>
        <ol className="about-timeline">
          {JOBS.map((job) => (
            <li key={job.company}>
              <span className="about-timeline-period">{job.period}</span>
              <div>
                <h3>{job.role}</h3>
                <p className="about-timeline-company">{job.company}</p>
                <p>{job.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="svc-section svc-split">
        <h2>Education</h2>
        <p className="about-plain">{EDUCATION}</p>
      </section>
    </SiteShell>
  );
}
