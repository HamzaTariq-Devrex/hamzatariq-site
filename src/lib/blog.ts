// Blog posts: MDX files in content/blog/<slug>.mdx with YAML frontmatter (rules in content/STYLE.md).
// Server-only (reads the file system at build time). Invalid frontmatter fails the build on purpose.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import categories from "../../content/blog-categories.json";
import { TITLE_SUFFIX } from "./seo";
import { isProductionSite } from "./site";

const POSTS_DIR = join(process.cwd(), "content", "blog");
const WORDS_PER_MINUTE = 220;

/**
 * Categories and the CTA closing each post (content/blog-categories.json, also read by
 * scripts/content-check.mjs): the four services link to their service page, Hiring to /hire.
 */
export type BlogCategory = {
  slug: string;
  name: string;
  description: string;
  cta: { title: string; text: string; href: string; label: string };
};
export const BLOG_CATEGORIES: BlogCategory[] = categories;
export const getCategory = (slug: string) => BLOG_CATEGORIES.find((c) => c.slug === slug);

export type Faq = { q: string; a: string };
export type TocItem = { id: string; text: string; level: 2 | 3 };
export type Cover = { src: string; alt: string; width: number; height: number };

export type Post = {
  slug: string;
  title: string;
  /** <title> without the site suffix; defaults to title. Must fit 60 characters with the suffix. */
  seoTitle: string;
  description: string;
  keyword: string;
  category: BlogCategory;
  tags: string[];
  published: string; // YYYY-MM-DD
  updated: string | null;
  cover: Cover | null;
  faq: Faq[];
  body: string;
  words: number;
  readingMinutes: number;
  toc: TocItem[];
};

const fail = (file: string, message: string): never => {
  throw new Error(`content/blog/${file}: ${message}`);
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
// gray-matter turns unquoted YAML dates into Date objects.
const asDate = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : value);

/** Headings (## and ###) outside code blocks, with the same ids rehype-slug gives them. */
const tocOf = (body: string): TocItem[] => {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inCode = false;
  for (const line of body.split("\n")) {
    if (line.trim().startsWith("```")) inCode = !inCode;
    const m = !inCode && line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = m[2].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");
    items.push({ id: slugger.slug(text), text, level: m[1].length as 2 | 3 });
  }
  return items;
};

const countWords = (body: string) =>
  body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`[\]()|-]/g, " ")
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w)).length;

const parse = (file: string): Post => {
  const raw = readFileSync(join(POSTS_DIR, file), "utf8");
  const { data, content } = matter(raw);
  const slug = file.replace(/\.mdx$/, "");
  const str = (key: string) => (typeof data[key] === "string" && data[key].trim() ? (data[key] as string).trim() : fail(file, `"${key}" is required`));

  const title = str("title");
  const seoTitle = typeof data.seoTitle === "string" ? data.seoTitle.trim() : title;
  if (seoTitle.length + TITLE_SUFFIX.length > 60) fail(file, `title for <title> is ${seoTitle.length + TITLE_SUFFIX.length} chars with the suffix (max 60); add a shorter seoTitle`);
  const description = str("description");
  if (description.length < 150 || description.length > 160) fail(file, `description is ${description.length} chars (150-160)`);
  const category = getCategory(str("category")) ?? fail(file, `unknown category "${data.category}"`);
  const published = asDate(data.published);
  if (typeof published !== "string" || !DATE.test(published)) fail(file, `"published" must be YYYY-MM-DD`);
  const updated = data.updated ? asDate(data.updated) : null;
  if (updated !== null && (typeof updated !== "string" || !DATE.test(updated))) fail(file, `"updated" must be YYYY-MM-DD`);
  const tags = Array.isArray(data.tags) ? data.tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean) : [];
  const faq = Array.isArray(data.faq) ? (data.faq as Faq[]).filter((f) => f?.q && f?.a) : [];
  const cover = data.cover && typeof data.cover === "object" ? (data.cover as Cover) : null;
  if (cover && (!cover.src || !cover.alt || !cover.width || !cover.height)) fail(file, "cover needs src, alt, width and height");

  const words = countWords(content);
  return {
    slug,
    title,
    seoTitle,
    description,
    keyword: str("keyword"),
    category,
    tags,
    published: published as string,
    updated: updated as string | null,
    cover,
    faq,
    body: content,
    words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    toc: tocOf(content),
  };
};

/** Today's date in Pakistan time (YYYY-MM-DD); a post is live from its published date. */
const today = () => new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const isScheduled = (post: Post) => post.published > today();

let cache: Post[] | null = null;
const allFiles = () => {
  cache ??= readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map(parse)
    .sort((a, b) => b.published.localeCompare(a.published));
  return cache;
};

/**
 * Posts visible on this build. The live site hides posts until their published date (the blog
 * revalidates daily, so they appear on time); local and preview builds show them with a badge.
 */
export const getPosts = () => allFiles().filter((p) => !isProductionSite || !isScheduled(p));
export const getPost = (slug: string) => getPosts().find((p) => p.slug === slug) ?? null;
export const getPostsInCategory = (slug: string) => getPosts().filter((p) => p.category.slug === slug);
export const getAllTags = () => [...new Set(getPosts().flatMap((p) => p.tags))].sort();
export const getPostsWithTag = (tag: string) => getPosts().filter((p) => p.tags.includes(tag));

/** Same category first, then most shared tags, then newest. */
export const getRelatedPosts = (post: Post, limit = 3) =>
  getPosts()
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      p,
      score: (p.category.slug === post.category.slug ? 10 : 0) + p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score || b.p.published.localeCompare(a.p.published))
    .slice(0, limit)
    .map((x) => x.p);

export const tagSlug = (tag: string) => tag.replace(/\s+/g, "-");
export const tagFromSlug = (slug: string) => getAllTags().find((t) => tagSlug(t) === slug) ?? null;

export const formatPostDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
