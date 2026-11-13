import type { MetadataRoute } from "next";
import { PROJECTS, isThinProject } from "@/data/projects";
import { SERVICES } from "@/data/services";
import { CASE_STUDIES } from "@/data/caseStudies";
import { TOOLS } from "@/data/tools";
import { getSolutions } from "@/lib/solutions";
import { BLOG_CATEGORIES, getPosts, getPostsInCategory } from "@/lib/blog";
import { SITE } from "@/lib/site";
import { hasReviews } from "@/lib/testimonials";

// Scheduled posts are added on their date by /api/cron/publish; hourly revalidation is the backup.
export const revalidate = 3600;

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
    ...TOOLS.map((t) => page(t.href, 0.8)),
    page("/solutions", 0.8),
    ...getSolutions().map((s) => page(`/solutions/${s.slug}`, 0.8)),
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
    ...(hasReviews ? [page("/reviews", 0.6)] : []),
    page("/contact", 0.7),
    ...PROJECTS.filter((p) => !isThinProject(p)).map((p) => page(`/work/${p.slug}`, p.url ? 0.6 : 0.4, "yearly")),
  ];
}
