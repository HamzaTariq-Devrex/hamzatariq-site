import { useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "./PageShell";
import ProjectCard, { useCardReveal } from "../components/ProjectCard";
import { CATEGORIES, PROJECTS } from "../data/projects";

const WorkPage = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get("category");
  const filter = CATEGORIES.find((c) => c === requested) ?? "All";
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter)),
    [filter]
  );
  useCardReveal(gridRef, [filter]);

  const countFor = (c: (typeof CATEGORIES)[number]) =>
    c === "All" ? PROJECTS.length : PROJECTS.filter((p) => p.category === c).length;

  return (
    <PageShell
      title="Work | Hamza Tariq"
      description="Custom websites and online stores designed and built by Hamza Tariq for brands in Pakistan and abroad."
    >
      <section className="page-hero">
        <span className="page-eyebrow">Portfolio</span>
        <h1>
          All <span>projects</span>
        </h1>
        <p>
          {PROJECTS.length} custom websites and online stores I've designed and built for brands in
          Pakistan and abroad, from fashion and jewellery to travel and B2B.
        </p>
      </section>

      <div className="page-filters" role="tablist" aria-label="Filter projects">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={filter === c}
            className={`page-filter ${filter === c ? "is-active" : ""}`}
            onClick={() => setParams(c === "All" ? {} : { category: c }, { replace: true })}
          >
            {c}
            <span>{countFor(c)}</span>
          </button>
        ))}
      </div>

      <div className="project-grid" ref={gridRef} key={filter}>
        {filtered.map((project, i) => (
          <ProjectCard key={project.slug} project={project} index={i} spa />
        ))}
      </div>
    </PageShell>
  );
};

export default WorkPage;
