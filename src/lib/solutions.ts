// Industry pages: MDX files in content/solutions/<slug>.mdx (structured frontmatter + prose body).
// Server-only (reads the file system at build time). Invalid frontmatter fails the build on purpose;
// scripts/content-check.mjs checks keywords, links and numbers.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { IconName } from "@/components/site/ds/Icon";
import { SERVICES } from "@/data/services";
import { PROJECTS } from "@/data/projects";
import { TITLE_SUFFIX } from "./seo";

const DIR = join(process.cwd(), "content", "solutions");

export type Solution = {
  slug: string;
  /** Short industry name for cards and breadcrumbs. */
  industry: string;
  title: string;
  seoTitle: string;
  description: string;
  keyword: string;
  icon: IconName;
  h1: string;
  h1Accent: string;
  lead: string;
  pains: { title: string; text: string }[];
  build: { service: string; title: string; text: string }[];
  features: string[];
  /** Real projects from src/data/projects.ts that fit this industry (may be empty). */
  projects: string[];
  faq: { q: string; a: string }[];
  order: number;
  body: string;
};

const fail = (file: string, message: string): never => {
  throw new Error(`content/solutions/${file}: ${message}`);
};

const parse = (file: string): Solution => {
  const { data, content } = matter(readFileSync(join(DIR, file), "utf8"));
  const str = (k: string) => (typeof data[k] === "string" && data[k].trim() ? (data[k] as string).trim() : fail(file, `"${k}" is required`));
  const list = <T,>(k: string, min: number) => {
    const v = Array.isArray(data[k]) ? (data[k] as T[]) : [];
    if (v.length < min) fail(file, `"${k}" needs at least ${min} items`);
    return v;
  };
  const title = str("title");
  const seoTitle = typeof data.seoTitle === "string" ? data.seoTitle.trim() : title;
  if (seoTitle.length + TITLE_SUFFIX.length > 60) fail(file, `title for <title> is ${seoTitle.length + TITLE_SUFFIX.length} chars with the suffix (max 60)`);
  const description = str("description");
  if (description.length < 150 || description.length > 160) fail(file, `description is ${description.length} chars (150-160)`);
  const build = list<Solution["build"][number]>("build", 3);
  for (const b of build) if (!SERVICES.some((s) => s.slug === b.service)) fail(file, `unknown service "${b.service}"`);
  const projects = Array.isArray(data.projects) ? (data.projects as string[]) : [];
  for (const p of projects) if (!PROJECTS.some((x) => x.slug === p)) fail(file, `unknown project "${p}"`);
  return {
    slug: file.replace(/\.mdx$/, ""),
    industry: str("industry"),
    title,
    seoTitle,
    description,
    keyword: str("keyword"),
    icon: str("icon") as IconName,
    h1: str("h1"),
    h1Accent: str("h1Accent"),
    lead: str("lead"),
    pains: list("pains", 3),
    build,
    features: list("features", 5),
    projects,
    faq: list("faq", 4),
    order: typeof data.order === "number" ? data.order : 99,
    body: content,
  };
};

let cache: Solution[] | null = null;
export const getSolutions = () => {
  cache ??= (existsSync(DIR) ? readdirSync(DIR) : [])
    .filter((f) => f.endsWith(".mdx"))
    .map(parse)
    .sort((a, b) => a.order - b.order);
  return cache;
};
export const getSolution = (slug: string) => getSolutions().find((s) => s.slug === slug) ?? null;
