"use client";

import { useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProjectCard from "../ProjectCard";
import { useCardReveal } from "../useCardReveal";
import { CATEGORIES, PROJECTS } from "@/data/projects";

const countFor = (c: (typeof CATEGORIES)[number]) =>
  c === "All" ? PROJECTS.length : PROJECTS.filter((p) => p.category === c).length;

const WorkBrowser = () => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter = CATEGORIES.find((c) => c === params.get("category")) ?? "All";
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter)),
    [filter]
  );
  useCardReveal(gridRef, [filter]);

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
            onClick={() =>
              router.replace(c === "All" ? pathname : `${pathname}?category=${encodeURIComponent(c)}`, {
                scroll: false,
              })
            }
          >
            {c}
            <span>{countFor(c)}</span>
          </button>
        ))}
      </div>

      <div className="project-grid" ref={gridRef} key={filter}>
        {filtered.map((project, i) => (
          <ProjectCard key={project.slug} project={project} index={i} priority={i < 3} />
        ))}
      </div>
    </>
  );
};

export default WorkBrowser;
