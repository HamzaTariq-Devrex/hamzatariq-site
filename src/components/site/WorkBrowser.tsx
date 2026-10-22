"use client";

import { useEffect, useState } from "react";
import ProjectCard from "../ProjectCard";
import { CATEGORIES, PROJECTS } from "@/data/projects";

type Filter = (typeof CATEGORIES)[number];

const countFor = (c: Filter) =>
  c === "All" ? PROJECTS.length : PROJECTS.filter((p) => p.category === c).length;

const WorkBrowserView = ({ filter, onSelect }: { filter: Filter; onSelect?: (f: Filter) => void }) => {
  const filtered = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter);
  return (
    <>
      <div className="page-filters" role="tablist" aria-label="Filter projects">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={filter === c}
            className={`page-filter ${filter === c ? "is-active" : ""}`}
            onClick={() => onSelect?.(c)}
          >
            {c}
            <span>{countFor(c)}</span>
          </button>
        ))}
      </div>

      <div className="project-grid is-static">
        {filtered.map((project, i) => (
          <ProjectCard key={project.slug} project={project} index={i} priority={i < 3} />
        ))}
      </div>
    </>
  );
};

const WorkBrowser = () => {
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("category");
    const match = CATEGORIES.find((c) => c === requested);
    if (match) setFilter(match);
  }, []);

  const select = (c: Filter) => {
    setFilter(c);
    const url = c === "All" ? window.location.pathname : `?category=${encodeURIComponent(c)}`;
    window.history.replaceState(null, "", url);
  };

  return <WorkBrowserView filter={filter} onSelect={select} />;
};

export default WorkBrowser;
