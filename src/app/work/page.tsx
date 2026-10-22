import { Suspense } from "react";
import type { Metadata } from "next";
import SiteShell from "@/components/site/SiteShell";
import WorkBrowser from "@/components/site/WorkBrowser";
import ProjectCard from "@/components/ProjectCard";
import { PROJECTS } from "@/data/projects";

export const metadata: Metadata = {
  title: "Work: 31 Custom Websites and Online Stores",
  description:
    "31 custom websites and online stores built at Devrex Digital for fashion, jewellery, home decor, beauty, travel and B2B brands in Pakistan and abroad.",
  alternates: { canonical: "/work" },
};

const StaticGrid = () => (
  <div className="project-grid is-static">
    {PROJECTS.map((project, i) => (
      <ProjectCard key={project.slug} project={project} index={i} />
    ))}
  </div>
);

export default function WorkPage() {
  return (
    <SiteShell active="work">
      <section className="page-hero">
        <span className="page-eyebrow">Portfolio</span>
        <h1>
          All <span>projects</span>
        </h1>
        <p>
          {PROJECTS.length} custom websites and online stores I&apos;ve built at Devrex Digital for brands in
          Pakistan and abroad, from fashion and jewellery to travel and B2B.
        </p>
      </section>

      <Suspense fallback={<StaticGrid />}>
        <WorkBrowser />
      </Suspense>
    </SiteShell>
  );
}
