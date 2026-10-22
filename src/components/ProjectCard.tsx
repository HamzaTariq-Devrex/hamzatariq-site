import { useEffect, type RefObject } from "react";
import { Link } from "react-router-dom";
import { IMAGE_BASE, type Project } from "../data/projects";
import "./styles/ProjectCard.css";

type Props = {
  project: Project;
  index: number;
  spa?: boolean;
};

const ProjectCard = ({ project, index, spa = false }: Props) => {
  const content = (
    <>
      <div className="project-card-media">
        <img
          src={IMAGE_BASE + project.image}
          alt={`${project.title} website`}
          loading="lazy"
          decoding="async"
        />
        <span className="project-card-cta">
          View project
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      <div className="project-card-body">
        <span className="project-card-label">{project.label}</span>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <span className="project-card-domain">
          {project.domain}
          {!project.url && <em>Offline</em>}
        </span>
      </div>
    </>
  );

  const props = {
    className: "project-card",
    "data-cursor": "disable",
    style: { transitionDelay: `${(index % 3) * 0.08}s` },
  };

  return spa ? (
    <Link to={`/work/${project.slug}`} {...props}>
      {content}
    </Link>
  ) : (
    <a href={`/work/${project.slug}`} {...props}>
      {content}
    </a>
  );
};

export default ProjectCard;

export const useCardReveal = (container: RefObject<HTMLElement>, deps: unknown[]) => {
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    root.querySelectorAll(".project-card:not(.is-in)").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
