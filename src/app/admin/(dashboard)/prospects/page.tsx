import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { getOwner } from "@/lib/supabase/server";
import { getProspectStats } from "@/lib/admin/data";
import { PageHead } from "@/components/admin/ui";
import { SkeletonCard } from "@/components/admin/Skeleton";
import OutreachControls from "@/components/admin/outreach/OutreachControls";
import SearchManager from "@/components/admin/outreach/SearchManager";
import DraftQueue, { type Draft } from "@/components/admin/outreach/DraftQueue";
import ProspectsBrowser, { type ProspectRow } from "@/components/admin/outreach/ProspectsBrowser";
import WhatsAppQueue from "@/components/admin/outreach/WhatsAppQueue";
import { dailyCap } from "@/lib/outreach/pipeline";
import { listProspects } from "./actions";

export const metadata: Metadata = { title: "Prospects" };

const DAYS = 14;
const QUEUE_COLUMNS =
  "id, name, business_type, city, country, timezone, website, phone, email, email_source, status, skip_reason, audit_score, lead_score, notes, lead_id, last_contacted_at, created_at, audits:prospect_audits(report_id, score, final_url, created_at, expires_at)";

// Each section loads on its own and streams in when ready; shared calls run once per request.
const stats = cache(() => getProspectStats(DAYS));
const db = async () => (await getOwner())!.supabase; // the layout redirects when signed out
const settings = cache(async () => (await db()).from("outreach_settings").select("paused, pause_reason, approve_first, started_at, next_send_at, last_imap_at").eq("id", 1).single());

const Failed = ({ what, message }: { what: string; message: string }) => (
  <p className="adm-error" role="alert">
    Could not load {what}: {message}
  </p>
);

async function Controls() {
  const [{ data: s, error }, st] = await Promise.all([settings(), stats()]);
  if (error || !s) return <Failed what="outreach settings" message={error?.message ?? "missing"} />;
  return (
    <OutreachControls
      settings={{ paused: s.paused, pauseReason: s.pause_reason, approveFirst: s.approve_first, startedAt: s.started_at, nextSendAt: s.next_send_at, lastImapAt: s.last_imap_at }}
      sent24h={st.sent_24h}
      cap={dailyCap(s.started_at)}
    />
  );
}

async function Drafts() {
  const supabase = await db();
  const [{ data, error }, { data: s }] = await Promise.all([
    supabase
      .from("outreach_messages")
      .select("id, step, subject, body, created_at, prospect:prospects(id, name, email, city, business_type, audit_score, lead_score)")
      .eq("status", "draft")
      .eq("direction", "out")
      .order("created_at")
      .limit(200),
    settings(),
  ]);
  if (error) return <Failed what="drafts" message={error.message} />;
  return <DraftQueue drafts={(data ?? []) as unknown as Draft[]} approveFirst={s?.approve_first ?? true} />;
}

async function Queue() {
  const { data, error } = await (await db())
    .from("prospects")
    .select(QUEUE_COLUMNS)
    .eq("status", "whatsapp")
    .order("lead_score", { ascending: false, nullsFirst: false })
    .limit(50)
    .overrideTypes<ProspectRow[]>();
  if (error) return <Failed what="the WhatsApp queue" message={error.message} />;
  return <WhatsAppQueue prospects={data ?? []} />;
}

async function SearchesAndStats() {
  const [{ data: searches, error }, st] = await Promise.all([
    (await db()).from("outreach_searches").select("id, business_type, city, country, active, timezone, last_run_at, last_found").order("created_at"),
    stats(),
  ]);
  if (error) return <Failed what="saved searches" message={error.message} />;
  return (
    <div className="adm-grid-2">
      <SearchManager searches={searches ?? []} />
      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Last {DAYS} days</h2>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table ox-stats">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Found</th>
                <th scope="col">Emailed</th>
                <th scope="col">Replied</th>
                <th scope="col">Bounced</th>
                <th scope="col">Unsub.</th>
              </tr>
            </thead>
            <tbody>
              {st.days.map((d) => (
                <tr key={d.day}>
                  <td className="adm-nowrap">{d.day}</td>
                  <td>{d.found}</td>
                  <td>{d.emailed}</td>
                  <td>{d.replied}</td>
                  <td>{d.bounced}</td>
                  <td>{d.unsubscribed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function List({ openId }: { openId: string | null }) {
  const [first, st] = await Promise.all([listProspects("all", "", 0), stats()]);
  return <ProspectsBrowser initial={first.rows} total={first.total} counts={{ ...st.by_status, all: st.total }} initialId={openId} />;
}

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  return (
    <main className="adm-page">
      <PageHead title="Prospects" text="Businesses found on OpenStreetMap, audited and emailed from your outreach Gmail. WhatsApp stays manual." />
      <Suspense fallback={<SkeletonCard rows={3} title={false} />}>
        <Controls />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={3} />}>
        <Drafts />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={3} />}>
        <Queue />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={6} />}>
        <SearchesAndStats />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={10} />}>
        <List openId={p ?? null} />
      </Suspense>
    </main>
  );
}
