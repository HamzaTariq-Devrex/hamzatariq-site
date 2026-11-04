// Marks a written (or expanded) post as published in the backlog, commits it with its SERP brief and
// the links added to older posts, and pushes to main (or, with --pr, pushes a branch and opens a pull
// request for the owner to review). Refuses to commit files outside the autopilot's allowed paths.
//
//   node scripts/autopilot/finish.mjs <slug>          commit + push to main (deploys)
//   node scripts/autopilot/finish.mjs <slug> --pr "why it failed"
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, briefPath, log, normalizeKeyword, readBacklog, readPosts, writeBacklog } from "./lib.mjs";

// docs/AUTOPILOT.md "Safety rules": the only paths an autopilot commit may touch.
const ALLOWED = [/^content\/blog\/[^/]+\.mdx$/, /^content\/seo\/briefs\/[^/]+\.md$/, /^content\/backlog\.json$/, /^public\/images\/blog\//, /^reports\//, /^OWNER_TODO\.md$/];

const [slug, flag, reason = ""] = process.argv.slice(2);
if (!slug) throw new Error("usage: finish.mjs <slug> [--pr reason]");
const file = `content/blog/${slug}.mdx`;
if (!existsSync(join(ROOT, file))) throw new Error(`${file} not found`);
if (!existsSync(join(ROOT, briefPath(slug)))) throw new Error(`${briefPath(slug)} not found: write the SERP brief first`);

const post = readPosts().find((p) => p.slug === slug);
const backlog = readBacklog();
const item = backlog.items.find((i) => normalizeKeyword(i.keyword) === normalizeKeyword(post.keyword));
if (!item) throw new Error(`no backlog item for keyword "${post.keyword}"`);
const expansion = item.expand === true;
item.status = "published";
item.publishedSlug = slug;
item.published = post.published;
delete item.expand;
writeBacklog(backlog);

const git = (...args) => execFileSync("git", args, { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
const changed = git("status", "--porcelain", "--untracked-files=all")
  .split("\n")
  .filter(Boolean)
  .map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());
const outside = changed.filter((p) => !ALLOWED.some((re) => re.test(p)));
if (outside.length) throw new Error(`refusing to commit: files outside the autopilot's allowed paths changed:\n  ${outside.join("\n  ")}`);
const backlinked = changed.filter((p) => /^content\/blog\/.+\.mdx$/.test(p) && p !== file);

const subject = expansion ? `Blog: expand pillar "${post.title}"` : `Blog: ${post.title}`;
const message = `${subject}\n\n${expansion ? `Pillar for "${post.keyword}" expanded to the full guide.` : `Autopilot post for "${post.keyword}", published ${post.published}.`}${
  backlinked.length ? `\nLinks added from: ${backlinked.map((p) => p.replace(/^content\/blog\/|\.mdx$/g, "")).join(", ")}.` : ""
}`;
const stage = () => git("add", "--", ...changed);

if (flag === "--pr") {
  const branch = `autopilot/${slug}`;
  git("checkout", "-b", branch);
  stage();
  git("commit", "-m", message);
  git("push", "-u", "origin", branch);
  const body = `Autopilot post that did not pass every check after one retry.\n\n**What failed:** ${reason || "see the run log"}\n\nReview, fix and merge, or close it. Nothing is live until this is merged.`;
  const url = execFileSync("gh", ["pr", "create", "--base", "main", "--head", branch, "--title", `Blog (needs review): ${post.title}`, "--body", body], { cwd: ROOT }).toString().trim();
  git("checkout", "main");
  log(`opened ${url}`);
} else {
  stage();
  git("commit", "-m", message);
  git("push", "origin", "HEAD:main");
  log(`pushed ${slug} to main`);
}
