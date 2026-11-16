// One-off outreach setup (safe to re-run):
//   npx tsx --env-file=.env.local scripts/outreach-setup.ts
// 1. Stores CRON_SECRET in Supabase Vault so the pg_cron job can call /api/outreach/tick.
//    CRON_SECRET must be the same value as in Vercel production, or every tick gets a 401.
// 2. Re-checks every queued, not-yet-emailed prospect with the brand/chain rules and skips the
//    ones that fail (their unsent drafts are removed; nothing already sent is touched).
// DRY=1 prints what would be skipped and changes nothing.
import { ox } from "../src/lib/outreach/db";
import { CHAIN_LOCATIONS, isBigOrganisation, isStoreLocatorPage } from "../src/lib/outreach/osm";

const DRY = process.env.DRY === "1";

const main = async () => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is not set in .env.local");
  if (!DRY) await ox.setCronSecret(secret);
  const cron = await ox.cronStatus();
  console.log(`Scheduler: secret ${cron.secret_set ? "stored in Vault" : "NOT stored"}, job ${cron.job ? `${cron.job.schedule} ${cron.job.active ? "active" : "inactive"}` : "missing"}`);

  const list = await ox.recheckList();
  let skipped = 0;
  for (const p of list) {
    const reason = isBigOrganisation(p.osm_tags ?? {}, p.name)
      ? "Chain, brand or public body"
      : isStoreLocatorPage(p.website)
        ? "Store-locator page of a bigger site"
        : p.name_count >= CHAIN_LOCATIONS
          ? `Same name at ${CHAIN_LOCATIONS}+ locations (chain)`
          : null;
    if (!reason) continue;
    skipped++;
    console.log(`${DRY ? "would skip" : "skip"}: ${p.name} (${p.status}) – ${reason}`);
    if (!DRY) await ox.skip(p.id, reason);
  }
  console.log(`Re-checked ${list.length} queued prospects, ${skipped} ${DRY ? "would be" : ""} skipped.`);
};

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
