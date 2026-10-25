import type { MetadataRoute } from "next";
import { PROJECTS } from "@/data/projects";
import { SERVICES } from "@/data/services";
import { CASE_STUDIES } from "@/data/caseStudies";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "monthly" | "yearly" = "monthly") => ({
    url: `${SITE.url}${path}`,
    changeFrequency,
    priority,
  });

  return [
    page("", 1),
    page("/services", 0.9),
    ...SERVICES.map((s) => page(`/services/${s.slug}`, 0.9)),
    page("/work", 0.8),
    ...CASE_STUDIES.map((c) => page(`/work/${c.slug}`, 0.8)),
    page("/about", 0.7),
    page("/hire", 0.7),
    page("/contact", 0.7),
    ...PROJECTS.map((p) => page(`/work/${p.slug}`, p.url ? 0.6 : 0.4, "yearly")),
  ];
}
