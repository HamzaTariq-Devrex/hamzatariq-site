// Marks a written post as published in the backlog, commits it, and pushes to main
// (or, with --pr, pushes a branch and opens a pull request for the owner to review).
//
//   node scripts/autopilot/finish.mjs <slug>          commit + push to main (deploys)
//   node scripts/autopilot/finish.mjs <slug> --pr "why it failed"
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, log, normalizeKeyword, readBacklog, readPosts, writeBacklog } from "./lib.mjs";

const [slug, flag, reason = ""] = process.argv.slice(2);
if (!slug) throw new Error("usage: finish.mjs <slug> [--pr reason]");
const file = join("content", "blog", `${slug}.mdx`);
if (!existsSync(join(ROOT, file))) throw new Error(`${file} not found`);

const post = readPosts().find((p) => p.slug === slug);
const backlog = readBacklog();
const item = backlog.items.find((i) => normalizeKeyword(i.keyword) === normalizeKeyword(post.keyword));
if (!item) throw new Error(`no backlog item for keyword "${post.keyword}"`);
item.status = "published";
item.publishedSlug = slug;
item.published = post.published;
writeBacklog(backlog);

const git = (...args) => execFileSync("git", args, { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
const message = `Blog: ${post.title}\n\nAutopilot post for "${post.keyword}", published ${post.published}.`;

if (flag === "--pr") {
  const branch = `autopilot/${slug}`;
  git("checkout", "-b", branch);
  git("add", file, "content/backlog.json");
  if (existsSync(join(ROOT, "public", "images", "blog"))) git("add", "public/images/blog");
  git("commit", "-m", message);
  git("push", "-u", "origin", branch);
  const body = `Autopilot post that did not pass every check after one retry.\n\n**What failed:** ${reason || "see the run log"}\n\nReview, fix and merge, or close it. Nothing is live until this is merged.`;
  const url = execFileSync("gh", ["pr", "create", "--base", "main", "--head", branch, "--title", `Blog (needs review): ${post.title}`, "--body", body], { cwd: ROOT }).toString().trim();
  git("checkout", "main");
  log(`opened ${url}`);
} else {
  git("add", file, "content/backlog.json");
  if (existsSync(join(ROOT, "public", "images", "blog"))) git("add", "public/images/blog");
  git("commit", "-m", message);
  git("push", "origin", "HEAD:main");
  log(`pushed ${slug} to main`);
}
