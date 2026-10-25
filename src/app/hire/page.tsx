import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import OwnerTodo from "@/components/site/OwnerTodo";
import CaseStudyCard from "@/components/site/CaseStudyCard";
import ProjectCard from "@/components/ProjectCard";
import { EDUCATION, JOBS } from "@/data/experience";
import { CASE_STUDIES } from "@/data/caseStudies";
import { PROJECTS } from "@/data/projects";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hire a React and Next.js Developer",
  description:
    "Hire Hamza Tariq, a full-stack React and Next.js developer: skills, tech stack, experience at Devrex Digital, GitHub and availability for new projects.",
  alternates: { canonical: "/hire" },
};

const SKILLS = [
  { group: "Frontend", items: ["React", "Next.js", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS"] },
  { group: "Motion & 3D", items: ["GSAP", "Framer Motion", "Three.js"] },
  { group: "What I build", items: ["Ecommerce stores", "Admin dashboards", "Web apps", "AI chatbots", "Responsive design"] },
  { group: "SEO", items: ["Technical SEO", "Next.js migrations", "Structured data", "Core Web Vitals"] },
];

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
    <SiteShell active="hire">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="about-hero">
        <div className="about-hero-text">
          <span className="page-eyebrow">For recruiters and teams</span>
          <h1>
            Hire a React &amp; <span>Next.js developer</span>
          </h1>
          <p>{SITE.bio}</p>
          <div className="hire-status">
            <span className="page-status" aria-hidden="true" />
            Available for new projects
          </div>
          <OwnerTodo what="Confirm availability: open to full-time, contract or remote roles?" />
          <div className="project-actions">
            <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Role / project enquiry")}`} className="page-btn page-btn-primary">
              Email me
            </a>
            <a href={SITE.social.github} target="_blank" rel="noreferrer" className="page-btn page-btn-ghost">
              GitHub profile
            </a>
            {SITE.cvUrl ? (
              <a href={SITE.cvUrl} download className="page-btn page-btn-ghost">
                Download CV
              </a>
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
          <strong>Full-stack developer</strong>
        </div>
        <div>
          <span>Focus</span>
          <strong>React & Next.js</strong>
        </div>
        <div>
          <span>Brands served</span>
          <strong>45+ at Devrex Digital</strong>
        </div>
        <div>
          <span>Education</span>
          <strong>{EDUCATION}</strong>
        </div>
      </section>

      <section className="svc-section">
        <h2>Skills &amp; tech stack</h2>
        <div className="hire-skills">
          {SKILLS.map((g) => (
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
                <p>{job.body}</p>
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
        <h2>Selected work</h2>
        <div className="project-grid is-static">
          {CASE_STUDIES.map((c) => (
            <CaseStudyCard key={c.slug} study={c} />
          ))}
          {PROJECTS.slice(0, 2).map((p, i) => (
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
