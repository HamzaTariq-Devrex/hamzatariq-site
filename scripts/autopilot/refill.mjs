// Backlog refill. With fewer than 20 queued topics (MIN_QUEUED), the autopilot adds 30 (REFILL_COUNT) based on real demand:
// Search Console queries (what people already find the site for) and the AI assistant's top questions.
// Every topic joins a cluster (content/seo/clusters.json) as a supporting post, with the full field set
// from content/seo/strategy.md: intent, funnel, 3-6 secondary keywords, 2-6 questions, reader, angle.
//
//   node scripts/autopilot/refill.mjs            prints {needed, candidates} as JSON for the writer
//   node scripts/autopilot/refill.mjs --add f    appends topics from a JSON array file, skipping
//                                               duplicate or reserved keywords; prints what was added
import { readFileSync } from "node:fs";
import { MIN_QUEUED, REFILL_COUNT, gscQuery, log, normalizeKeyword, readBacklog, readClusters, rpc, writeBacklog } from "./lib.mjs";

const INTENTS = ["hire", "buy", "compare", "learn", "fix"];
const FUNNEL = ["awareness", "consideration", "decision"];
const MAX_SUPPORTING = 15;
const clusters = readClusters();
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
    const cluster = clusters.find((c) => c.id === t.cluster);
    const supporting = cluster ? backlog.items.filter((i) => i.cluster === cluster.id && i.role !== "pillar").length : 0;
    const problems = [
      !k && "no keyword",
      taken.has(k) && "duplicate or reserved keyword",
      k.split(" ").length < 3 && "head term (use a 3+ word long-tail query)",
      !t.title && "no title",
      !cluster && `unknown cluster "${t.cluster}"`,
      cluster && supporting >= MAX_SUPPORTING && `cluster "${cluster.id}" already has ${MAX_SUPPORTING} supporting topics`,
      !INTENTS.includes(t.intent) && "intent must be hire | buy | compare | learn | fix",
      !FUNNEL.includes(t.funnel) && "funnel must be awareness | consideration | decision",
      !(Array.isArray(t.secondary) && t.secondary.length >= 3 && t.secondary.length <= 6) && "needs 3-6 secondary keywords",
      !(Array.isArray(t.questions) && t.questions.length >= 2 && t.questions.length <= 6) && "needs 2-6 questions",
      String(t.angle ?? "").length < 40 && "needs an angle (what the top results don't say)",
    ].filter(Boolean);
    if (problems.length) {
      log(`skipped "${t.keyword}": ${problems.join("; ")}`);
      continue;
    }
    taken.add(k);
    const item = {
      keyword: t.keyword.toLowerCase(),
      title: t.title,
      cluster: cluster.id,
      pillar: cluster.pillar.slug,
      role: "supporting",
      intent: t.intent,
      funnel: t.funnel,
      category: cluster.category,
      targetPage: cluster.servicePage,
      reader: t.reader || "business owner",
      secondary: t.secondary,
      questions: t.questions,
      angle: t.angle,
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
  const clusterRoom = clusters.map((c) => {
    const supporting = backlog.items.filter((i) => i.cluster === c.id && i.role !== "pillar");
    return { id: c.id, name: c.name, supporting: supporting.length, queued: supporting.filter((i) => i.status === "queued").length, room: MAX_SUPPORTING - supporting.length };
  });
  console.log(JSON.stringify({ queued, needed: queued < MIN_QUEUED ? REFILL_COUNT : 0, clusters: clusterRoom, candidates }, null, 2));
}
