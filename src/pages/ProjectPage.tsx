import { Link, useParams } from "react-router-dom";
import PageShell from "./PageShell";
import NotFound from "./NotFound";
import { IMAGE_BASE, PROJECTS } from "../data/projects";

const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={diagonal ? "M7 17 17 7M9 7h8v8" : "M5 12h14M13 6l6 6-6 6"} />
  </svg>
);

const ProjectPage = () => {
  const { slug } = useParams();
  const index = PROJECTS.findIndex((p) => p.slug === slug);
  if (index === -1) return <NotFound />;

  const project = PROJECTS[index];
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(index + 1) % PROJECTS.length];
  const enquiry = `mailto:hamzabuildsweb@gmail.com?subject=${encodeURIComponent(
    `A website like ${project.title}`
  )}`;

  return (
    <PageShell
      title={`${project.title} | Work by Hamza Tariq`}
      description={project.description}
    >
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link to="/work">Work</Link>
        <span>/</span>
        <Link to={`/work?category=${encodeURIComponent(project.category)}`}>{project.category}</Link>
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
              <span className="project-offline">This client's site is currently offline</span>
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
            <dt>Category</dt>
            <dd>{project.category}</dd>
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
          <img src={IMAGE_BASE + project.image} alt={`${project.title} website on desktop`} />
        </figure>
        {project.mobileImage && (
          <figure className="project-phone">
            <img src={IMAGE_BASE + project.mobileImage} alt={`${project.title} website on mobile`} />
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
        <Link to={`/work/${prev.slug}`} className="project-pager-link">
          <span>Previous project</span>
          <strong>{prev.title}</strong>
        </Link>
        <Link to="/work" className="project-pager-all">
          All projects
        </Link>
        <Link to={`/work/${next.slug}`} className="project-pager-link is-next">
          <span>Next project</span>
          <strong>
            {next.title}
            <Arrow />
          </strong>
        </Link>
      </nav>
    </PageShell>
  );
};

export default ProjectPage;
