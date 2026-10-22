import { OG_SIZE, renderOg } from "@/lib/og";
import { PROJECTS } from "@/data/projects";

export const alt = "Project by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  return renderOg({
    eyebrow: project ? `${project.label} · Built at Devrex Digital` : "Project",
    title: project?.title ?? "Project",
    subtitle: project?.description,
    footer: project ? `hamzatariq.site/work/${project.slug}` : "hamzatariq.site",
  });
}
