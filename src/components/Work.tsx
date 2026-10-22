import { useRef } from "react";
import "./styles/Work.css";
import ProjectCard, { useCardReveal } from "./ProjectCard";
import { PROJECTS } from "../data/projects";

const Work = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const featured = PROJECTS.slice(0, window.innerWidth < 768 ? 4 : 6);
  useCardReveal(gridRef, []);

  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <div className="work-header">
          <div>
            <span className="work-eyebrow">Selected projects</span>
            <h2>
              My <span>Work</span>
            </h2>
          </div>
          <p className="work-intro">
            Custom websites and online stores I've designed and built for brands in Pakistan and abroad.
          </p>
        </div>

        <div className="project-grid" ref={gridRef}>
          {featured.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} />
          ))}
        </div>

        <div className="work-more">
          <a href="/work" className="work-more-btn" data-cursor="disable">
            View all {PROJECTS.length} projects
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Work;
