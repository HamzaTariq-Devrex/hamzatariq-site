import Image from "next/image";
import Link from "next/link";
import { IMAGE_BASE, type Project } from "@/data/projects";
import "./styles/ProjectCard.css";

type Props = {
  project: Project;
  index: number;
  fullReload?: boolean;
  priority?: boolean;
};

const ProjectCard = ({ project, index, fullReload = false, priority = false }: Props) => {
  const content = (
    <>
      <div className="project-card-media">
        <Image
          src={IMAGE_BASE + project.image}
          alt={`${project.title} website homepage`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 420px"
          priority={priority}
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

  return fullReload ? (
    <a href={`/work/${project.slug}`} {...props}>
      {content}
    </a>
  ) : (
    <Link href={`/work/${project.slug}`} {...props}>
      {content}
    </Link>
  );
};

export default ProjectCard;
