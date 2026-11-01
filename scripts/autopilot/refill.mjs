// Backlog refill. With fewer than 10 queued topics, the autopilot adds 15 new ones based on real demand:
// Search Console queries (what people already find the site for) and the AI assistant's top questions.
//
//   node scripts/autopilot/refill.mjs            prints {needed, candidates} as JSON for the writer
//   node scripts/autopilot/refill.mjs --add f    appends topics from a JSON array file, skipping
//                                               duplicate or reserved keywords; prints what was added
import { readFileSync } from "node:fs";
import { MIN_QUEUED, gscQuery, log, normalizeKeyword, readBacklog, rpc, writeBacklog } from "./lib.mjs";

const CATEGORIES = ["nextjs-websites", "dashboards", "ai-chatbots", "react-nextjs-seo", "hiring"];
const TARGETS = {
  "nextjs-websites": "/services/nextjs-websites",
  dashboards: "/services/dashboards",
  "ai-chatbots": "/services/ai-chatbots",
  "react-nextjs-seo": "/services/react-nextjs-seo",
  hiring: "/hire",
};
// Main keywords of service and tool pages: never used for posts.
const RESERVED = ["next.js website development", "custom dashboard development", "ai chatbot for website", "react seo services", "free seo audit tool"].map(normalizeKeyword);

const backlog = readBacklog();
const taken = new Set([...backlog.items.map((i) => normalizeKeyword(i.keyword)), ...RESERVED]);
const args = process.argv.slice(2);

if (args[0] === "--add") {
  const incoming = JSON.parse(readFileSync(args[1], "utf8"));
  const added = [];
  for (const t of incoming) {
    const k = normalizeKeyword(t.keyword);
    if (!k || taken.has(k) || !CATEGORIES.includes(t.category) || !t.title) {
      log(`skipped "${t.keyword}" (duplicate, reserved, or missing title/category)`);
      continue;
    }
    taken.add(k);
    const item = {
      keyword: t.keyword.toLowerCase(),
      title: t.title,
      category: t.category,
      reader: t.reader || "business owner",
      targetPage: TARGETS[t.category],
      status: "queued",
      publishedSlug: null,
      ...(t.source ? { source: t.source } : {}),
      ...(t.blockedBy ? { blockedBy: t.blockedBy } : {}),
    };
    backlog.items.push(item);
    added.push(item);
  }
  writeBacklog(backlog);
  console.log(JSON.stringify({ added: added.length, items: added }, null, 2));
} else {
  const queued = backlog.items.filter((i) => i.status === "queued" && !i.blockedBy).length;
  const candidates = { searchConsole: [], assistant: [], errors: [] };
  if (queued < MIN_QUEUED) {
    try {
      const { rows } = await gscQuery({ dimensions: ["query"], days: 90, rowLimit: 500 });
      candidates.searchConsole = rows
        .map((r) => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: Math.round(r.position * 10) / 10 }))
        .filter((r) => !taken.has(normalizeKeyword(r.query)))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 60);
    } catch (error) {
      candidates.errors.push(`Search Console: ${error.message}`);
    }
    try {
      candidates.assistant = (await rpc("app_top_questions", { p_days: 90, p_limit: 60 })).map((r) => ({ question: r.question, asked: r.asked }));
    } catch (error) {
      candidates.errors.push(`Assistant questions: ${error.message}`);
    }
  }
  console.log(JSON.stringify({ queued, needed: queued < MIN_QUEUED ? 15 : 0, categories: CATEGORIES, candidates }, null, 2));
}
