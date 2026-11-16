// Test emails from REAL audits, sent ONLY to Hamza's own address (SITE.email) with [TEST] in the
// subject. Nothing is stored as a draft and nothing goes to the businesses.
//   npx tsx --env-file=.env.local scripts/outreach-test-send.ts
// For each niche: finds an audited UK prospect with a website (running discovery and the real
// qualification if needed), writes email 1 with the real writer and checker, and sends it. For the
// jewellery one it also sends the day-3 follow-up in the same thread.
import { SITE } from "../src/lib/site";
import { ox, type Prospect, type ProspectAudit } from "../src/lib/outreach/db";
import { discoverRun } from "../src/lib/outreach/coverage";
import { qualify } from "../src/lib/outreach/qualify";
import { checkEmail1, draftDay3, draftEmail1, prospectFindings, reportUrl, words } from "../src/lib/outreach/compose";
import { sendOutreach } from "../src/lib/outreach/mail";

/** DRY=1: write and check the emails, send nothing. */
const DRY = process.env.DRY === "1";

const NICHES = [
  { type: "jewellery", cities: ["Manchester", "London", "Birmingham"] },
  { type: "dentist", cities: ["London", "Manchester", "Birmingham"] },
  { type: "restaurant", cities: ["Manchester", "London", "Birmingham"] },
] as const;

const auditedWithSite = async (type: string): Promise<{ p: Prospect; a: ProspectAudit } | null> => {
  // Already audited, with a website and an email, and not emailed yet: reuse it.
  const ready = (await ox.toDraft(500)).find((p) => p.business_type === type && p.country === "GB" && p.audit?.result);
  if (ready?.audit) return { p: ready, a: ready.audit };
  // Qualify found prospects of this type (UK only) until one has a real website audit.
  for (let round = 0; round < 3; round++) {
    const found = (await ox.toAudit(500)).filter((p) => p.business_type === type && p.country === "GB");
    for (const p of found.slice(0, 12)) {
      const outcome = await qualify(p);
      console.log(`  qualify ${p.name}: ${outcome}`);
      const d = await ox.detail(p.id);
      if (d?.audit?.result && d.prospect.status === "audited") return { p: d.prospect, a: d.audit };
    }
    if (!found.length) break;
  }
  return null;
};

// ONLY=dentist: run one niche.
for (const n of NICHES.filter((x) => !process.env.ONLY || x.type === process.env.ONLY)) {
  console.log(`\n== ${n.type}`);
  let pick = await auditedWithSite(n.type);
  if (!pick) {
    // The next coverage cells for this niche (UK first).
    for (let round = 0; round < n.cities.length; round++) {
      console.log(`  discovering ${n.type}…`);
      console.log("  ", JSON.stringify(await discoverRun(Date.now() + 120_000, n.type)));
      pick = await auditedWithSite(n.type);
      if (pick) break;
    }
  }
  if (!pick) {
    console.log("  no audited prospect with a website found");
    continue;
  }
  const { p, a } = pick;
  const d = await draftEmail1(p, a);
  const facts = [p.name, p.city ?? "", ...d.findings.map((f) => f.cost), String(Math.min(3, d.findings.length))].join("\n");
  console.log(`  ${p.name} (${p.website}) · ${d.source} · ${words(d.body)} words · subject ${d.variant}: "${d.subject}"`);
  console.log(`  findings: ${d.findings.map((f) => f.id).join(", ")}`);
  console.log(`  check: ${checkEmail1(d.body, d.subject, facts).join("; ") || "passes"}`);
  console.log(d.body.replace(/^/gm, "    | "));
  const first = DRY ? "<dry-run>" : await sendOutreach({ to: SITE.email, subject: `[TEST] ${d.subject}`, body: d.body });
  console.log(`  sent email 1 → ${SITE.email} ${first}`);
  if (n.type === "jewellery") {
    const f3 = draftDay3(p, `[TEST] ${d.subject}`, reportUrl(a.report_id), prospectFindings(p, a.result));
    console.log(`  day 3 · ${words(f3.body)} words · "${f3.subject}"`);
    console.log(f3.body.replace(/^/gm, "    | "));
    const id = DRY ? "<dry-run>" : await sendOutreach({ to: SITE.email, subject: f3.subject, body: f3.body, threadId: first });
    console.log(`  sent day 3 in the same thread → ${SITE.email} ${id}`);
  }
}
