// What each page of the site targets (main + secondary keywords, H2s and FAQ questions), from the
// content files and data in the repo, plus the planned topics in content/backlog.json. Used to tell
// "a page already answers this query" from "missing page", and to place keyword ideas.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { SERVICES } from "@/data/services";
import { TOOLS } from "@/data/tools";
import { PROJECTS } from "@/data/projects";
import { getSolutions } from "@/lib/solutions";
import { CLUSTERS } from "@/lib/blog";
import backlog from "../../../content/backlog.json";

const STOP = new Set(["a", "an", "the", "is", "are", "your", "my", "of", "to", "in", "on", "it", "for", "and", "with", "how", "do", "does", "what", "can", "i", "vs", "me", "near", "best", "much", "should", "which", "who", "why", "when", "or", "be", "you", "get"]);

export const normalize = (t: string) =>
  String(t ?? "")
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const words = (t: string) =>
  normalize(t)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));

/** Share of the query's meaningful words found in `phrase`. */
export const overlap = (query: string, phrase: string) => {
  const q = words(query);
  if (!q.length) return 1;
  const p = new Set(words(phrase));
  return q.filter((w) => p.has(w)).length / q.length;
};

export type Target = {
  path: string;
  kind: "post" | "service" | "solution" | "tool" | "project";
  keyword: string;
  /** Main keyword, secondary keywords, H2/H3 headings and FAQ questions. */
  phrases: string[];
  cluster: string | null;
  role?: string;
  published?: string;
};

let cached: Target[] | null = null;

export const siteTargets = (): Target[] => {
  if (cached) return cached;
  const list: Target[] = [];
  const dir = join(process.cwd(), "content", "blog");
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
      const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
      const headings = [...content.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1]);
      const faq = Array.isArray(data.faq) ? data.faq.map((q: { q?: string }) => String(q.q ?? "")) : [];
      const published = data.published instanceof Date ? data.published.toISOString().slice(0, 10) : String(data.published ?? "");
      list.push({
        path: `/blog/${f.replace(/\.mdx$/, "")}`,
        kind: "post",
        keyword: String(data.keyword ?? ""),
        phrases: [String(data.keyword ?? ""), ...((data.secondary as string[]) ?? []), ...headings, ...faq].filter(Boolean),
        cluster: data.cluster ?? null,
        role: data.role ?? "supporting",
        published,
      });
    }
  }
  for (const s of SERVICES) list.push({ path: `/services/${s.slug}`, kind: "service", keyword: s.keyword, phrases: [s.keyword, s.name, ...s.faqs.map((f) => f.q)], cluster: CLUSTERS.find((c) => c.servicePage === `/services/${s.slug}`)?.id ?? null });
  for (const s of getSolutions()) list.push({ path: `/solutions/${s.slug}`, kind: "solution", keyword: s.keyword, phrases: [s.keyword, s.title, ...s.faq.map((f) => f.q)], cluster: null });
  // Client project pages answer searches for the client's own name (navigational queries).
  for (const p of PROJECTS) list.push({ path: `/work/${p.slug}`, kind: "project", keyword: p.title, phrases: [p.title, p.domain ?? ""].filter(Boolean), cluster: null });
  for (const t of TOOLS) list.push({ path: t.href, kind: "tool", keyword: t.keyword, phrases: [t.keyword, t.name], cluster: null });
  cached = list;
  return list;
};

type BacklogItem = { keyword: string; cluster?: string; status?: string; secondary?: string[]; questions?: string[] };
export const backlogItems = () => (backlog as { items: BacklogItem[] }).items;

/** The page whose main keyword or other phrases best answer the query (≥ 60% of its words), if any. */
export const targetFor = (query: string) => {
  let best: { target: Target; score: number; main: boolean } | null = null;
  for (const t of siteTargets()) {
    const main = overlap(query, t.keyword);
    const any = Math.max(main, ...t.phrases.map((p) => overlap(query, p)));
    if (any >= 0.6 && (!best || any > best.score || (any === best.score && main > 0.6))) best = { target: t, score: any, main: main >= 0.6 };
  }
  return best;
};

/** A planned (backlog) topic that already covers the query. */
export const plannedFor = (query: string) =>
  backlogItems().find((b) => [b.keyword, ...(b.secondary ?? []), ...(b.questions ?? [])].some((p) => overlap(query, p) >= 0.7)) ?? null;

/** Cluster for a query: the cluster whose name, pillar keyword or posts share the most words. */
export const clusterFor = (query: string) => {
  let best: { id: string; score: number } | null = null;
  for (const c of CLUSTERS) {
    const posts = siteTargets().filter((t) => t.cluster === c.id);
    const score = Math.max(overlap(query, c.name), overlap(query, c.pillar.keyword), ...posts.map((p) => overlap(query, p.keyword)));
    if (score >= 0.34 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best?.id ?? null;
};

/** Search intent from the wording (the backlog's intent values). */
export const intentOf = (query: string) => {
  const q = normalize(query);
  if (/\b(hire|freelance|freelancer|agency|developer for|consultant|services?|company)\b/.test(q)) return "hire";
  if (/\b(cost|price|pricing|quote|cheap|budget|package)\b/.test(q)) return "buy";
  if (/\b(vs|versus|compare|comparison|alternative|better|best)\b/.test(q)) return "compare";
  if (/\b(not|fix|error|issue|problem|broken|why is|not working)\b/.test(q)) return "fix";
  return "learn";
};
