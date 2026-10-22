import type { MetadataRoute } from "next";
import { PROJECTS } from "@/data/projects";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE.url}/work`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const projects: MetadataRoute.Sitemap = PROJECTS.map((p) => ({
    url: `${SITE.url}/work/${p.slug}`,
    changeFrequency: "yearly",
    priority: p.url ? 0.6 : 0.4,
  }));

  return [...pages, ...projects];
}
