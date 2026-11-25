// One test email per offer (owner, 2026-11-25) from businesses found in the imported pool: no website
// (free sample homepage), weak site under 50 (quick fixes) and content (audit 70+, 3 blog topics).
// Sent ONLY to Hamza's own address (SITE.email) with [TEST] in the subject and the private research
// note under the email. Nothing is queued and nothing goes to the businesses (research is saved, as in the tick).
//   npx tsx --env-file=.env.local scripts/outreach-test-offers.ts
//   ONLY=no-website|fixes|content for one offer, DRY=1 to print only, ROUNDS=8 (qualify rounds per offer).
import { SITE } from "../src/lib/site";
import { ox, type Prospect, type ProspectAudit } from "../src/lib/outreach/db";
import { discoverRun } from "../src/lib/outreach/coverage";
import { qualify } from "../src/lib/outreach/qualify";
import { biz, checkEmail1, draftEmail1, emailCity, offerFor, personalLine, words, type Offer } from "../src/lib/outreach/compose";
import { researchFor } from "../src/lib/outreach/pipeline";
import { sendOutreach } from "../src/lib/outreach/mail";
import { takesBookings } from "../src/lib/outreach/osm-types";
import { autoCheck } from "../src/lib/outreach/checks";
import { liveSiteProblem } from "../src/lib/outreach/research";

const DRY = process.env.DRY === "1";
const ROUNDS = Number(process.env.ROUNDS ?? 8);
const OFFERS: Offer[] = (["no-website", "fixes", "content"] as Offer[]).filter((o) => !process.env.ONLY || o === process.env.ONLY);
const tried = new Set<string>();

type Listed = Prospect & { audit: ProspectAudit | null };
const fits = (p: Listed, offer: Offer) =>
  !!p.email && !!p.audit && offerFor(p) === offer && (offer !== "fixes" || (p.audit_score ?? 100) < 50) && (offer !== "no-website" || (p.flags as { noSite?: string } | undefined)?.noSite === "verified");

/** Research, write, check and send one; true when the test email went out. */
const tryOne = async (p: Listed, offer: Offer) => {
  if (tried.has(p.id)) return false;
  tried.add(p.id);
  const r = await researchFor(p);
  if (!r?.research) return void console.log(`  ${p.name}: inactive, skipped`), false;
  if (r.research.pending || r.research.wait) return void console.log(`  ${p.name}: research waiting for the AI writer (${r.research.wait ?? "busy"})`), false;
  if (offer !== "no-website" && !r.research.note) return void console.log(`  ${p.name}: no research note, not sent`), false;
  let d: Awaited<ReturnType<typeof draftEmail1>>;
  try {
    d = await draftEmail1(r, p.audit);
  } catch (e) {
    return void console.log(`  ${r.name}: skipped: ${(e as Error).message}`), false;
  }
  const facts = [biz(r), emailCity(r) ?? "", personalLine(r), ...d.findings.map((f) => f.cost), String(Math.min(3, d.findings.length))].join("\n");
  const problems = checkEmail1(d.body, d.subject, facts, takesBookings(r.business_type));
  const verdict = await autoCheck(r, p.audit?.result ?? null, d.findings, d.body, problems);
  if (verdict.kind !== "ok") return void console.log(`  ${r.name}: ${verdict.kind === "review" ? "Needs a look" : "rejected"}: ${verdict.reason}`), false;
  const live = await liveSiteProblem(r);
  if (live) return void console.log(`  ${r.name}: pre-send check: ${live}`), false;
  const q = r.research.quality;
  const note = [
    "---",
    `PRIVATE RESEARCH NOTE (test only; not part of the email the business gets). Offer: ${offer}`,
    `Business: ${r.name} · ${r.business_type} · ${[r.district, r.city, r.country].filter(Boolean).join(", ")} · ${r.website ?? "no website (verified)"} · OSM ${r.osm_id}`,
    `Email: ${r.email} (source: ${r.email_source ?? "osm"}) · phone ${r.phone ?? "-"}`,
    `Active check: ${r.research.signals.join(", ") || "-"}`,
    `Note: ${r.research.note ?? "-"}`,
    `Sells: ${r.research.sells ?? "-"} · Area: ${r.research.area ?? "-"} · Customers: ${r.research.customers ?? "-"} · Owner: ${r.research.owner ?? "not clearly shown"}`,
    `Facts (with the words from their site): ${r.research.facts?.map((f) => `${f.fact} ("${f.quote}")`).join("; ") || "-"}`,
    `Personal line: ${r.research.line ?? "none"}`,
    `Findings used: ${d.findings.map((f) => f.id).join(", ")}`,
    `Quality score: ${q?.total ?? "-"} · audit ${r.audit_score ?? "-"} · ${words(d.body)} words · ${d.source} · checks pass · homepage re-opened: OK`,
  ].join("\n");
  console.log(`\n== ${offer}: ${r.name}\n${d.subject}\n${d.body}\n${note}`);
  if (!DRY) await sendOutreach({ to: SITE.email, subject: `[TEST] ${d.subject}`, body: `${d.body}\n\n\n${note}` });
  return true;
};

let sent = 0;
for (const offer of OFFERS) {
  console.log(`\n### ${offer}`);
  let done = false;
  for (let round = 0; round < ROUNDS && !done; round++) {
    for (const p of (await ox.toDraft(500)).filter((x) => fits(x, offer))) if ((done = await tryOne(p, offer))) break;
    if (done) break;
    // Qualify found businesses of the current area (no website first for that offer), taking more from the pool when none are left.
    let found = (await ox.toAudit(200)).filter((p) => (offer === "no-website" ? !p.website : !!p.website));
    if (!found.length) {
      console.log("  discover:", JSON.stringify(await discoverRun(Date.now() + 60_000)));
      found = (await ox.toAudit(200)).filter((p) => (offer === "no-website" ? !p.website : !!p.website));
    }
    const batch = found.slice(0, 8);
    const outcomes = await Promise.all(batch.map((p) => qualify(p).catch((e) => `failed: ${(e as Error).message}`)));
    batch.forEach((p, i) => console.log(`  qualify ${p.name}: ${outcomes[i]}`));
  }
  if (done) sent++;
  else console.log(`  no ${offer} lead passed every check in ${ROUNDS} rounds`);
}
console.log(`\n${sent} test email(s) ${DRY ? "written (dry run)" : `sent to ${SITE.email}`}.`);
