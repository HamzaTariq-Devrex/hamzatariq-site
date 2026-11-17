// Test emails from REAL researched leads (owner, 2026-11-17), sent ONLY to Hamza's own address
// (SITE.email) with [TEST] in the subject and the private research note under the email.
// Nothing is queued and nothing goes to the businesses (their research note is saved, as in the tick).
//   npx tsx --env-file=.env.local scripts/outreach-test-research.ts
//   COUNT=3 (default), DRY=1 to print only.
import { SITE } from "../src/lib/site";
import { ox, type Prospect, type ProspectAudit } from "../src/lib/outreach/db";
import { discoverRun } from "../src/lib/outreach/coverage";
import { qualify } from "../src/lib/outreach/qualify";
import { biz, checkEmail1, draftEmail1, personalLine, words } from "../src/lib/outreach/compose";
import { researchFor } from "../src/lib/outreach/pipeline";
import { sendOutreach } from "../src/lib/outreach/mail";
import { takesBookings } from "../src/lib/outreach/osm-types";
import { autoCheck } from "../src/lib/outreach/checks";

const DRY = process.env.DRY === "1";
const COUNT = Number(process.env.COUNT ?? 3);
const done = new Set<string>();
let sent = 0;

const tryOne = async (p: Prospect & { audit: ProspectAudit | null }) => {
  // SKIP="Name A,Name B": businesses already sent as tests.
  if (done.has(p.id) || !p.website || (process.env.SKIP ?? "").split(",").includes(p.name)) return;
  done.add(p.id);
  // Research again with the current rules (the note and line are saved, as in the tick).
  const r = await researchFor({ ...p, research: undefined, researched_at: undefined } as typeof p);
  if (!r?.research) {
    console.log(`  ${p.name}: inactive, skipped`);
    return;
  }
  if (r.research.pending || !r.research.note) {
    console.log(`  ${p.name}: no research note (the AI writer didn't answer), not sent`);
    return;
  }
  if (!r.research.line) console.log(`  ${p.name}: no specific line found (would send without one)`);
  const d = await draftEmail1(r, p.audit);
  const facts = [biz(r), r.city ?? "", personalLine(r), ...d.findings.map((f) => f.cost), String(Math.min(3, d.findings.length))].join("\n");
  const problems = checkEmail1(d.body, d.subject, facts, takesBookings(r.business_type));
  // The same automatic checks as production: "Needs a look" or rejected drafts are not sent.
  const verdict = await autoCheck(r, p.audit?.result ?? null, d.findings, d.body, problems);
  if (verdict.kind !== "ok") {
    console.log(`  ${r.name}: ${verdict.kind === "review" ? "held for Needs a look" : "rejected"}: ${verdict.reason}`);
    return;
  }
  const q = r.research.quality;
  const note = [
    "---",
    "PRIVATE RESEARCH NOTE (test only; not part of the email the business gets)",
    `Business: ${r.name} · ${r.business_type} · ${[r.city, r.country].filter(Boolean).join(", ")} · ${r.website}`,
    `Active check: ${r.research.signals.join(", ")}`,
    `Note: ${r.research.note ?? "-"}`,
    `Sells: ${r.research.sells ?? "-"} · Area: ${r.research.area ?? "-"} · Customers: ${r.research.customers ?? "-"} · Owner: ${r.research.owner ?? "not clearly shown"}`,
    `Facts (with the words from their site): ${r.research.facts?.map((f) => `${f.fact} ("${f.quote}")`).join("; ") || "-"}`,
    `Personal line: ${r.research.line ?? "none"}`,
    `Quality score: ${q?.total} (active ${q?.active}, size ${q?.size}, gain ${q?.gain}) · audit ${r.audit_score}`,
    `Pages read: ${r.research.sources?.join(", ")}`,
    `Checks: ${problems.join("; ") || "pass"} · ${words(d.body)} words · ${d.source}`,
  ].join("\n");
  console.log(`\n== ${r.name}\n${d.subject}\n${d.body}\n${note}`);
  if (problems.length) return;
  if (!DRY) await sendOutreach({ to: SITE.email, subject: `[TEST] ${d.subject}`, body: `${d.body}\n\n\n${note}` });
  sent++;
};

for (let round = 0; round < 6 && sent < COUNT; round++) {
  for (const p of (await ox.toDraft(200)).filter((x) => x.website && x.audit?.result)) {
    if (sent >= COUNT) break;
    await tryOne(p);
  }
  if (sent >= COUNT) break;
  // Qualify found businesses (the current area), discovering more when none are left.
  const found = (await ox.toAudit(30)).filter((p) => p.website);
  if (!found.length) console.log("discover:", JSON.stringify(await discoverRun(Date.now() + 120_000)));
  for (const p of found.slice(0, 12)) console.log(`  qualify ${p.name}: ${await qualify(p)}`);
}
console.log(`\n${sent} test email(s) ${DRY ? "written (dry run)" : `sent to ${SITE.email}`}.`);
