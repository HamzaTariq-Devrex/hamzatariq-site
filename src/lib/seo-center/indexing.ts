// Order for asking Google to index pages by hand (Search Console "Request indexing", about 10 a day):
// pillar posts first, then industry pages, free tools, other blog posts, blog listings, the rest.
import { CLUSTERS } from "@/lib/blog";
import { SITE_ORIGIN, templateOf } from "./config";

const PILLARS = new Set(CLUSTERS.map((c) => `/blog/${c.pillar.slug}`));

export const indexPriority = (path: string) => {
  if (PILLARS.has(path)) return 0;
  const t = templateOf(path);
  if (t === "solution" || t === "solutions-index") return 1;
  if (t === "tool") return 2;
  if (t === "blog-post") return 3;
  if (t === "blog-index" || t === "blog-category") return 4;
  if (t === "service" || t === "services-index" || t === "home") return 5;
  return 6;
};

export const PRIORITY_LABELS = ["Pillar posts", "Industry pages", "Free tools", "Blog posts", "Blog listings", "Main pages", "Other pages"];

/** Paths sorted by priority (stable within a group), as full URLs. */
export const orderForIndexing = (paths: string[]) =>
  [...paths]
    .sort((a, b) => indexPriority(a) - indexPriority(b) || a.localeCompare(b))
    .map((path) => ({ path, url: `${SITE_ORIGIN}${path === "/" ? "/" : path}`, group: PRIORITY_LABELS[indexPriority(path)] }));
