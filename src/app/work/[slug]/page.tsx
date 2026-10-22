import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import { IMAGE_BASE, PROJECTS } from "@/data/projects";
import { SITE } from "@/lib/site";
import { jsonLd, projectDescription, projectTitle } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

const findProject = (slug: string) => PROJECTS.findIndex((p) => p.slug === slug);

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS[findProject(slug)];
  if (!project) return {};
  const title = projectTitle(project);
  const description = projectDescription(project);
  return {
    title,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: { title, description, url: `/work/${project.slug}`, type: "article" },
  };
}

const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={diagonal ? "M7 17 17 7M9 7h8v8" : "M5 12h14M13 6l6 6-6 6"} />
  </svg>
);

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const index = findProject(slug);
  if (index === -1) notFound();

  const project = PROJECTS[index];
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(index + 1) % PROJECTS.length];
  const pageUrl = `${SITE.url}/work/${project.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Work", item: `${SITE.url}/work` },
          { "@type": "ListItem", position: 3, name: project.title, item: pageUrl },
        ],
      },
      {
        "@type": "CreativeWork",
        "@id": `${pageUrl}#project`,
        name: `${project.title} website`,
        description: project.description,
        url: pageUrl,
        image: IMAGE_BASE + project.image,
        genre: project.label,
        creator: { "@id": `${SITE.url}/#person` },
        publisher: { "@type": "Organization", name: SITE.agency.name, url: SITE.agency.url },
        ...(project.url ? { sameAs: project.url } : {}),
      },
    ],
  };
  const enquiry = `mailto:${SITE.email}?subject=${encodeURIComponent(`A website like ${project.title}`)}`;

  return (
    <SiteShell active="work">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/work">Work</Link>
        <span>/</span>
        <a href={`/work?category=${encodeURIComponent(project.category)}`}>{project.category}</a>
        <span>/</span>
        <span aria-current="page">{project.title}</span>
      </nav>

      <section className="project-hero">
        <div className="project-hero-text">
          <span className="page-eyebrow">{project.label}</span>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
          <div className="project-actions">
            {project.url ? (
              <a href={project.url} target="_blank" rel="noreferrer" className="page-btn page-btn-primary">
                Visit live site
                <Arrow diagonal />
              </a>
            ) : (
              <span className="project-offline">This client&apos;s site is currently offline</span>
            )}
            <a href={enquiry} className="page-btn page-btn-ghost">
              Get a site like this
            </a>
          </div>
        </div>
        <dl className="project-meta">
          <div>
            <dt>Industry</dt>
            <dd>{project.label}</dd>
          </div>
          <div>
            <dt>Built at</dt>
            <dd>
              <a href={SITE.agency.url} target="_blank" rel="noreferrer">
                {SITE.agency.name}
              </a>
            </dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>{project.domain}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{project.url ? "Live" : "Offline"}</dd>
          </div>
        </dl>
      </section>

      <section className={`project-showcase ${project.mobileImage ? "" : "no-mobile"}`}>
        <figure className="project-browser">
          <div className="project-browser-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <em>{project.domain}</em>
          </div>
          <Image
            src={IMAGE_BASE + project.image}
            alt={`${project.title} website on desktop`}
            width={1440}
            height={1200}
            sizes="(max-width: 760px) 100vw, (max-width: 1000px) 70vw, 900px"
            priority
          />
        </figure>
        {project.mobileImage && (
          <figure className="project-phone">
            <Image
              src={IMAGE_BASE + project.mobileImage}
              alt={`${project.title} website on mobile`}
              width={390}
              height={844}
              sizes="(max-width: 760px) 62vw, 260px"
            />
          </figure>
        )}
      </section>

      {project.features.length > 0 && (
        <section className="project-features">
          <h2>On the site</h2>
          <ul>
            {project.features.map((feature) => (
              <li key={feature}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="project-pager" aria-label="More projects">
        <Link href={`/work/${prev.slug}`} className="project-pager-link">
          <span>Previous project</span>
          <strong>{prev.title}</strong>
        </Link>
        <Link href="/work" className="project-pager-all">
          All projects
        </Link>
        <Link href={`/work/${next.slug}`} className="project-pager-link is-next">
          <span>Next project</span>
          <strong>
            {next.title}
            <Arrow />
          </strong>
        </Link>
      </nav>
    </SiteShell>
  );
}
