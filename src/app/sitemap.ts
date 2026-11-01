import type { MetadataRoute } from "next";
import { PROJECTS } from "@/data/projects";
import { SERVICES } from "@/data/services";
import { CASE_STUDIES } from "@/data/caseStudies";
import { SEO_AUDIT_TOOL } from "@/data/tools";
import { BLOG_CATEGORIES, getPosts, getPostsInCategory } from "@/lib/blog";
import { SITE } from "@/lib/site";

// Rebuilt daily so scheduled blog posts are added on their published date.
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: `${SITE.url}${path}`,
    changeFrequency,
    priority,
  });
  const posts = getPosts();

  return [
    page("", 1),
    page("/services", 0.9),
    ...SERVICES.map((s) => page(`/services/${s.slug}`, 0.9)),
    page(SEO_AUDIT_TOOL.href, 0.8),
    page("/blog", 0.8, "weekly"),
    ...posts.map((p) => ({
      url: `${SITE.url}/blog/${p.slug}`,
      lastModified: p.updated ?? p.published,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...BLOG_CATEGORIES.filter((c) => getPostsInCategory(c.slug).length > 0).map((c) => page(`/blog/category/${c.slug}`, 0.5, "weekly")),
    page("/work", 0.8),
    ...CASE_STUDIES.map((c) => page(`/work/${c.slug}`, 0.8)),
    page("/about", 0.7),
    page("/hire", 0.7),
    page("/contact", 0.7),
    ...PROJECTS.map((p) => page(`/work/${p.slug}`, p.url ? 0.6 : 0.4, "yearly")),
  ];
}
