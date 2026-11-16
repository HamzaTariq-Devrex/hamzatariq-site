// Weekly SEO email to the owner (Monday 9:00 PKT): only numbers from the database.
import { SITE } from "@/lib/site";
import { sendOwnerAlert } from "@/lib/leads/email";
import type { Weekly } from "./db";

const change = (cur: number, prev: number) => (prev ? `${cur >= prev ? "+" : ""}${Math.round(((cur - prev) / prev) * 100)}%` : cur ? "new" : "no change");
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export const weeklyLines = (w: Weekly) => {
  const link = `${SITE.url}/admin/seo`;
  const lines: string[] = [];
  if (!w.end) {
    lines.push("No Search Console data yet: GSC_SERVICE_ACCOUNT_JSON is not set, or the first sync hasn't run. Crawl results and fixes are on the dashboard.");
  } else {
    lines.push(
      `Google, 7 days to ${w.end} vs the 7 before:\nClicks ${w.cur.clicks} (${change(w.cur.clicks, w.prev.clicks)}), impressions ${w.cur.impressions} (${change(w.cur.impressions, w.prev.impressions)}).`,
    );
    if (w.gained.length) lines.push(`Top queries gained:\n${w.gained.map((q) => `• ${q.query}: ${signed(q.dc)} clicks, ${signed(q.di)} impressions`).join("\n")}`);
    if (w.lost.length) lines.push(`Top queries lost:\n${w.lost.map((q) => `• ${q.query}: ${signed(q.dc)} clicks, ${signed(q.di)} impressions`).join("\n")}`);
  }
  lines.push(
    w.done.length
      ? `Fixes done automatically this week (${w.done.length}):\n${w.done.map((f) => `• ${f.title}${f.commit ? ` (${f.commit.slice(0, 7)})` : ""}`).join("\n")}`
      : "No fixes were applied this week.",
  );
  lines.push(
    w.waiting.length
      ? `Waiting for your approval (${w.waiting.length}):\n${w.waiting.slice(0, 10).map((f) => `• ${f.title}`).join("\n")}${w.waiting.length > 10 ? `\n…and ${w.waiting.length - 10} more` : ""}\nApprove or dismiss: ${link}?tab=fixes`
      : "Nothing is waiting for your approval.",
  );
  if (w.auto_queued) lines.push(`${w.auto_queued} safe fix(es) queued for the next SEO autopilot run.`);
  if (w.ideas.length) lines.push(`New keyword ideas:\n${w.ideas.map((k) => `• ${k.keyword}${k.impressions ? ` (${k.impressions} impressions)` : ""}${k.cluster ? `, ${k.cluster}` : ""}`).join("\n")}\nReview: ${link}?tab=keywords`);
  if (w.open_issues) lines.push(`${w.open_issues} open crawl error(s): ${link}?tab=issues`);
  lines.push(`Dashboard: ${link}`);
  return lines;
};

export const sendWeeklyReport = (w: Weekly) =>
  sendOwnerAlert(`SEO weekly${w.end ? `: ${w.cur.clicks} clicks, ${w.cur.impressions} impressions` : ""}`, weeklyLines(w), SITE.email, "Hamza's SEO autopilot");
