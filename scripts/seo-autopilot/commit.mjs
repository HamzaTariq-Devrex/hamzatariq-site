// Commits the working tree for ONE SEO fix and pushes it to main, then prints the commit hash.
// Refuses files outside the allowed paths, so a safe fix can never change code.
//   node scripts/seo-autopilot/commit.mjs "<subject>" "<why, with the data>"              safe fix
//   node scripts/seo-autopilot/commit.mjs "<subject>" "<why>" --approved                  owner-approved fix
import { execFileSync } from "node:child_process";

// Safe fixes: blog posts, their briefs and the backlog only (docs/SEO_AUTOPILOT.md).
const SAFE = [/^content\/blog\/[^/]+\.mdx$/, /^content\/seo\/briefs\/[^/]+\.md$/, /^content\/backlog\.json$/, /^public\/images\/blog\//];
// Never, not even approved: Search Console verification, IndexNow key, env files.
const NEVER = [/^public\/google0a499a204a55eeb8\.html$/, /^public\/718bcb0be670c128fd877ee016f03bef\.txt$/, /(^|\/)\.env/];

const [subject, why = "", flag] = process.argv.slice(2);
if (!subject) {
  console.error('usage: commit.mjs "<subject>" "<why>" [--approved]');
  process.exit(1);
}
const approved = flag === "--approved";
const git = (...a) => execFileSync("git", a, { stdio: ["ignore", "pipe", "inherit"] }).toString().trim();

const changed = git("status", "--porcelain", "--untracked-files=all")
  .split("\n")
  .filter(Boolean)
  .map((l) => l.slice(3).replace(/^.* -> /, "").replace(/^"|"$/g, ""));
if (!changed.length) {
  console.error("nothing to commit");
  process.exit(1);
}
const forbidden = changed.filter((p) => NEVER.some((re) => re.test(p)));
if (forbidden.length) {
  console.error(`refusing to commit protected files:\n  ${forbidden.join("\n  ")}`);
  process.exit(1);
}
const outside = approved ? [] : changed.filter((p) => !SAFE.some((re) => re.test(p)));
if (outside.length) {
  console.error(`refusing to commit: a safe fix may only change blog posts, briefs and the backlog:\n  ${outside.join("\n  ")}`);
  process.exit(1);
}
git("add", "--", ...changed);
git("commit", "-m", `SEO: ${subject}\n\n${why}\n\nSEO autopilot (${approved ? "approved by the owner in /admin/seo" : "safe fix"}).`);
git("push", "origin", "HEAD:main");
console.log(git("rev-parse", "HEAD"));
