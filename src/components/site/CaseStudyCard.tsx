import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/data/caseStudies";
import "../styles/ProjectCard.css";

const CaseStudyCard = ({ study, fullReload = false }: { study: CaseStudy; fullReload?: boolean }) => {
  const cover = study.images[0];
  const Wrapper = fullReload ? "a" : Link;
  return (
    <Wrapper href={`/work/${study.slug}`} className="project-card is-case" data-cursor="disable">
      <div className="project-card-media">
        <Image src={cover.src} alt={cover.alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 420px" />
        <span className="project-card-cta">
          Read case study
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      <div className="project-card-body">
        <span className="project-card-label">{study.label}</span>
        <h3>{study.title}</h3>
        <p>{study.headline}</p>
        <span className="project-card-domain">
          {study.results[0].label}: {study.results[0].before} → {study.results[0].after}
        </span>
      </div>
    </Wrapper>
  );
};

export default CaseStudyCard;
