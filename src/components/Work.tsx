import { useRef } from "react";
import "./styles/Work.css";
import ProjectCard from "./ProjectCard";
import CaseStudyCard from "./site/CaseStudyCard";
import { CASE_STUDIES } from "@/data/caseStudies";
import { useCardReveal } from "./useCardReveal";
import { PROJECTS } from "@/data/projects";

const Work = () => {
  const gridRef = useRef<HTMLDivElement>(null);
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
            My own site, plus custom websites and online stores built at Devrex Digital for brands in Pakistan and abroad.
          </p>
        </div>

        <div className="project-grid is-home" ref={gridRef}>
          {CASE_STUDIES.map((study) => (
            <CaseStudyCard key={study.slug} study={study} fullReload />
          ))}
          {PROJECTS.slice(0, 6 - CASE_STUDIES.length).map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i + CASE_STUDIES.length} fullReload />
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
