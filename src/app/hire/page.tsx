import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import OwnerTodo from "@/components/site/OwnerTodo";
import CvLink from "@/components/site/CvLink";
import CaseStudyCard from "@/components/site/CaseStudyCard";
import ProjectCard from "@/components/ProjectCard";
import { CV_PROJECTS, CV_SKILLS, CV_SUMMARY, EDUCATION_HISTORY, JOBS, LANGUAGES } from "@/data/experience";
import WhereIWork from "@/components/site/WhereIWork";
import ReviewStrip from "@/components/site/ReviewStrip";
import { HIRE_REVIEWS } from "@/lib/testimonials";
import { CASE_STUDIES } from "@/data/caseStudies";
import { PROJECTS } from "@/data/projects";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hire a React and Next.js Developer",
  description:
    "Hire Hamza Tariq, a frontend developer (Next.js, React, TypeScript) with 40+ live websites: CV, skills, experience at Devrex Digital, projects and GitHub.",
  alternates: { canonical: "/hire" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Hire", item: `${SITE.url}/hire` },
      ],
    },
    {
      "@type": "ProfilePage",
      url: `${SITE.url}/hire`,
      mainEntity: { "@id": `${SITE.url}/#person` },
    },
  ],
};

export default function HirePage() {
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="about-hero">
        <div className="about-hero-text">
          <span className="page-eyebrow">For recruiters and teams</span>
          <h1>
            Hire a React &amp; <span>Next.js developer</span>
          </h1>
          <p>{CV_SUMMARY}</p>
          <div className="hire-status">
            <span className="page-status" aria-hidden="true" />
            Available for new projects
          </div>
          <ul className="hire-availability">
            <li>{SITE.availability.roles}</li>
            <li>{SITE.availability.start}</li>
          </ul>
          <WhereIWork />
          <div className="project-actions">
            <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Role / project enquiry")}`} className="page-btn page-btn-primary">
              Email me
            </a>
            <a href={SITE.social.github} target="_blank" rel="noreferrer" className="page-btn page-btn-ghost">
              GitHub profile
            </a>
            {SITE.cvUrl ? (
              <CvLink href={SITE.cvUrl} className="page-btn page-btn-ghost" from="hire" />
            ) : (
              <OwnerTodo what="Upload the new CV PDF and set SITE.cvUrl. The download button appears once it is set." />
            )}
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

      <section className="hire-facts" aria-label="Quick facts">
        <div>
          <span>Role</span>
          <strong>Frontend developer · Next.js / React / TypeScript</strong>
        </div>
        <div>
          <span>Experience</span>
          <strong>2+ years · 40+ live production websites</strong>
        </div>
        <div>
          <span>Based in</span>
          <strong>Pakistan · remote, US, UK and EU time zones</strong>
        </div>
        <div>
          <span>Languages</span>
          <strong>{LANGUAGES.map((l) => `${l.name} (${l.level.split(" ")[0].toLowerCase()})`).join(", ")}</strong>
        </div>
      </section>

      <section className="svc-section">
        <h2>Skills &amp; tech stack</h2>
        <div className="hire-skills">
          {CV_SKILLS.map((g) => (
            <div key={g.group}>
              <h3>{g.group}</h3>
              <ul className="about-chips">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
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
                <ul className="hire-highlights">
                  {job.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <ul className="about-chips">
                  {job.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="svc-section">
        <h2>Education &amp; languages</h2>
        <div className="hire-edu">
          {EDUCATION_HISTORY.map((e) => (
            <div key={e.title}>
              <span className="about-timeline-period">{e.period.replace(" - ", "–")}</span>
              <h3>{e.title}</h3>
              <p className="about-timeline-company">{e.school}</p>
            </div>
          ))}
          {LANGUAGES.map((l) => (
            <div key={l.name}>
              <span className="about-timeline-period">Language</span>
              <h3>{l.name}</h3>
              <p className="about-timeline-company">{l.level}</p>
            </div>
          ))}
        </div>
      </section>

      <ReviewStrip reviews={HIRE_REVIEWS} title="What clients say about the work" text="Reviews posted on Instagram by brands whose websites I led. Word for word." />

      <section className="svc-section">
        <h2>Selected work</h2>
        <div className="project-grid is-static">
          {CASE_STUDIES.map((c) => (
            <CaseStudyCard key={c.slug} study={c} />
          ))}
          {CV_PROJECTS.map((slug) => PROJECTS.find((p) => p.slug === slug)!).map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} />
          ))}
        </div>
        <div className="project-actions">
          <Link href="/work" className="page-btn page-btn-ghost">
            See all projects
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
