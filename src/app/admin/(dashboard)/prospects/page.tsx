import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache } from "react";
import { getOwner } from "@/lib/supabase/server";
import { PAGE_SIZE, getOutreachStats, getProspectStats } from "@/lib/admin/data";
import { bounceMeaning, formatDate } from "@/lib/admin/labels";
import { PageHead } from "@/components/admin/ui";
import { SkeletonCard } from "@/components/admin/Skeleton";
import OutreachControls from "@/components/admin/outreach/OutreachControls";
import OutreachStats from "@/components/admin/outreach/OutreachStats";
import Coverage from "@/components/admin/outreach/Coverage";
import DraftQueue, { type Draft } from "@/components/admin/outreach/DraftQueue";
import ProspectsBrowser from "@/components/admin/outreach/ProspectsBrowser";
import WhatsAppQueue, { type QueueItem } from "@/components/admin/outreach/WhatsAppQueue";
import { typeLabel } from "@/components/admin/outreach/prospect-shared";
import { bufferTarget, dailyCap } from "@/lib/outreach/pipeline";
import Funnel from "@/components/admin/outreach/Funnel";
import MapTab from "@/components/admin/outreach/MapTab";
import { pktDay } from "@/lib/outreach/map";
import { ox, type CoverageRow } from "@/lib/outreach/db";
import { DAILY_TARGET_PER_NICHE, progress } from "@/lib/outreach/coverage";
import { manualMessage } from "@/lib/outreach/compose";
import { bounceType } from "@/lib/outreach/mail";
import type { AuditResult } from "@/lib/audit/types";
import { listProspects } from "./actions";

export const metadata: Metadata = { title: "Prospects" };

const DAYS = 14;
const TABS = [
  ["ready", "Needs a look"],
  ["map", "Map"],
  ["coverage", "Coverage"],
  ["sent", "Sent"],
  ["hot", "Hot replies"],
  ["whatsapp", "WhatsApp queue"],
  ["suppressed", "Suppressed"],
  ["all", "All prospects"],
] as const;
type Tab = (typeof TABS)[number][0];
const STEP = ["Email 1", "Day 3", "Day 7", "Reply", "Check-back"];
const DRAFT_COLUMNS = "id, step, subject, body, created_at, variant, review_reason, prospect:prospects(id, name, email, city, business_type, audit_score, lead_score)";

// Each section loads on its own and streams in; shared calls run once per request.
const stats = cache(() => getOutreachStats());
const dayStats = cache(() => getProspectStats(DAYS));
const db = async () => (await getOwner())!.supabase; // the layout redirects when signed out
const settings = cache(async () => (await db()).from("outreach_settings").select("paused, pause_reason, started_at, next_send_at, last_imap_at, last_tick_at").eq("id", 1).single());

const Failed = ({ what, message }: { what: string; message: string }) => (
  <p className="adm-error" role="alert">
    Could not load {what}: {message}
  </p>
);

const Pager = ({ tab, page, total }: { tab: Tab; page: number; total: number }) =>
  total > PAGE_SIZE ? (
    <nav className="ox-pager" aria-label="Pages">
      {page > 0 ? <Link href={`?tab=${tab}&page=${page - 1}`}>← Newer</Link> : <span />}
      <span className="adm-muted">
        {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
      </span>
      {(page + 1) * PAGE_SIZE < total ? <Link href={`?tab=${tab}&page=${page + 1}`}>Older →</Link> : <span />}
    </nav>
  ) : null;

async function Controls() {
  const [{ data: s, error }, st, cron, health] = await Promise.all([settings(), dayStats(), ox.cronStatus().catch(() => null), ox.state().catch(() => undefined)]);
  if (error || !s) return <Failed what="outreach settings" message={error?.message ?? "missing"} />;
  return (
    <OutreachControls
      settings={{ paused: s.paused, pauseReason: s.pause_reason, startedAt: s.started_at, nextSendAt: s.next_send_at, lastImapAt: s.last_imap_at, lastTickAt: s.last_tick_at }}
      scheduler={cron ? cron.secret_set && !!cron.job?.active : null}
      sent24h={st.sent_24h}
      cap={dailyCap(s.started_at, health)}
    />
  );
}

const PKT = 5 * 3_600_000;
const pktStart = (t = Date.now()) => Date.parse(`${pktDay(t)}T00:00:00Z`) - PKT;

async function Pipeline() {
  try {
    const [state, today, week] = await Promise.all([ox.state(), ox.funnel(new Date(pktStart()).toISOString()), ox.funnel(new Date(pktStart() - 6 * 86_400_000).toISOString())]);
    const cap = dailyCap(state.settings.started_at, state);
    return <Funnel today={today} week={week} ready={state.ready} target={bufferTarget(cap)} cap={cap} spamBlocks7d={state.spam_blocks_7d} bounces7d={state.bounces_7d} />;
  } catch (e) {
    return <Failed what="the pipeline funnel" message={(e as Error).message} />;
  }
}

async function Numbers() {
  return <OutreachStats s={await stats()} />;
}

async function Tabs({ active }: { active: Tab }) {
  const s = await stats();
  const count: Record<Tab, number | null> = { ready: s.tabs.ready, map: null, coverage: null, sent: s.tabs.sent, hot: s.tabs.hot, whatsapp: s.tabs.whatsapp, suppressed: s.tabs.suppressed, all: null };
  return (
    <nav className="ox-tabs" aria-label="Outreach">
      {TABS.map(([key, label]) => (
        <Link key={key} href={`?tab=${key}`} className={key === active ? "is-active" : ""} aria-current={key === active ? "page" : undefined}>
          {label}
          {count[key] != null && <span className="adm-count">{count[key]}</span>}
        </Link>
      ))}
    </nav>
  );
}

async function Ready({ page }: { page: number }) {
  const { data, error, count } = await (await db())
    .from("outreach_messages")
    .select(DRAFT_COLUMNS, { count: "exact" })
    .eq("status", "review")
    .eq("direction", "out")
    .order("created_at")
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="drafts" message={error.message} />;
  return (
    <>
      <DraftQueue drafts={(data ?? []) as unknown as Draft[]} />
      <Pager tab="ready" page={page} total={count ?? 0} />
    </>
  );
}

async function Sent({ page }: { page: number }) {
  const { data, error, count } = await (await db())
    .from("outreach_messages")
    .select("id, step, subject, variant, sent_at, prospect:prospects(id, name, business_type, city, email, reply_class, status)", { count: "exact" })
    .eq("direction", "out")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="sent emails" message={error.message} />;
  type Row = { id: string; step: number; subject: string; variant: string | null; sent_at: string; prospect: { id: string; name: string; business_type: string; city: string | null; email: string; reply_class: string | null; status: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  return (
    <section className="adm-card">
      {rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Email</th>
                <th scope="col">Subject</th>
                <th scope="col">Reply</th>
                <th scope="col">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`?tab=all&p=${r.prospect?.id}`} className="ox-row">
                      <strong>{r.prospect?.name}</strong>
                      <span className="adm-muted">
                        {typeLabel(r.prospect?.business_type ?? "")}
                        {r.prospect?.city ? `, ${r.prospect.city}` : ""}
                      </span>
                    </Link>
                  </td>
                  <td className="adm-muted">{STEP[r.step ?? 0]}</td>
                  <td>
                    {r.subject}
                    {r.variant && <span className="adm-muted"> · {r.variant}</span>}
                  </td>
                  <td>{r.prospect?.reply_class ? <span className={`adm-badge ox-reply is-${r.prospect.reply_class}`}>{r.prospect.reply_class.replace("_", " ")}</span> : <span className="adm-muted">–</span>}</td>
                  <td className="adm-nowrap adm-muted">{formatDate(r.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-muted">Nothing sent yet. Approved emails go out on weekdays, 9:00–17:00 in each business&apos;s time zone.</p>
      )}
      <Pager tab="sent" page={page} total={count ?? 0} />
    </section>
  );
}

async function Hot() {
  const supabase = await db();
  const { data: people, error } = await supabase
    .from("prospects")
    .select("id, name, email, phone, business_type, city, reply_class, updated_at, lead_id")
    .in("reply_class", ["interested", "price", "question"])
    .not("status", "in", "(won,lost)")
    .order("updated_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) return <Failed what="hot replies" message={error.message} />;
  return (
    <>
      <section className="adm-card">
        <div className="adm-card-head">
          <h2>People who replied</h2>
          <span className="adm-muted">HOT = needs you; the others were answered automatically</span>
        </div>
        {people?.length ? (
          <ul className="ox-searches">
            {people.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span className="adm-muted">
                    {p.reply_class === "question" ? "HOT: needs your answer" : p.reply_class === "price" ? "Asked about price (prices sent)" : "Said yes (fixes sent)"} · {p.email}
                    {p.phone ? ` · ${p.phone}` : ""} · {formatDate(p.updated_at)}
                  </span>
                </div>
                <div className="ox-search-actions">
                  <Link href={`?tab=all&p=${p.id}`}>Open thread</Link>
                  {p.lead_id && <Link href={`/admin/leads?lead=${p.lead_id}`}>Lead</Link>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-muted">No replies yet. A "yes" gets the fixes and a price question gets the starting prices automatically; anything else lands here as HOT and in your inbox.</p>
        )}
      </section>
    </>
  );
}

async function Queue() {
  const { data, error } = await (await db())
    .from("prospects")
    .select("id, name, business_type, city, country, phone, instagram, audit_score, lead_score, osm_tags, audits:prospect_audits(created_at, checks:result->checks, extras:result->extras, lab:result->pagespeed->lab)")
    .eq("status", "whatsapp")
    .order("lead_score", { ascending: false, nullsFirst: false })
    .limit(PAGE_SIZE);
  if (error) return <Failed what="the WhatsApp queue" message={error.message} />;
  type Row = Omit<QueueItem, "message"> & { osm_tags: Record<string, string>; audits: { created_at: string; checks: AuditResult["checks"] | null; extras: AuditResult["extras"] | null; lab: NonNullable<AuditResult["pagespeed"]>["lab"] | null }[] };
  const items: QueueItem[] = ((data ?? []) as unknown as Row[]).map(({ audits, osm_tags, ...p }) => {
    const a = [...audits].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
    // Only the parts of the audit the message needs (never the stored screenshot).
    const result = a?.checks ? ({ checks: a.checks, extras: a.extras ?? undefined, pagespeed: a.lab ? { performance: null, lab: a.lab, field: [] } : null } as unknown as AuditResult) : null;
    return { ...p, message: manualMessage({ name: p.name, business_type: p.business_type, osm_tags, city: p.city }, result) };
  });
  return <WhatsAppQueue items={items} />;
}

async function Suppressed({ page }: { page: number }) {
  const { data, error, count } = await (await db())
    .from("suppression_list")
    .select("email, reason, detail, created_at, prospect:prospects(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="the suppression list" message={error.message} />;
  type Row = { email: string; reason: string; detail: string | null; created_at: string; prospect: { name: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  return (
    <section className="adm-card">
      <p className="adm-muted">Permanent: these addresses are never emailed again.</p>
      {rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Business</th>
                <th scope="col">Reason</th>
                <th scope="col">Bounce type</th>
                <th scope="col">Bounce detail</th>
                <th scope="col">Since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email}>
                  <td>{r.email}</td>
                  <td>{r.prospect?.name ?? "–"}</td>
                  <td>{r.reason}</td>
                  <td>{r.reason === "bounced" ? ({ spam: "Spam/policy block", address: "Bad address", other: "Other" } as const)[bounceType(r.detail)] : "–"}</td>
                  <td>
                    {r.detail ? (
                      <>
                        {bounceMeaning(r.detail) && <strong>{bounceMeaning(r.detail)}</strong>}
                        <div className="adm-muted">{r.detail}</div>
                      </>
                    ) : (
                      <span className="adm-muted">–</span>
                    )}
                  </td>
                  <td className="adm-nowrap adm-muted">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-muted">No suppressed addresses.</p>
      )}
      <Pager tab="suppressed" page={page} total={count ?? 0} />
    </section>
  );
}

async function All({ openId }: { openId: string | null }) {
  const [st, first, ds] = await Promise.all([stats(), listProspects("all", "", 0), dayStats()]);
  return (
    <>
      <ProspectsBrowser initial={first.rows} total={first.total} counts={{ ...ds.by_status, all: ds.total }} initialId={openId} />
      <div>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Last {DAYS} days</h2>
            <span className="adm-muted">{st.suppressed} suppressed</span>
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
                {ds.days.map((d) => (
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
    </>
  );
}

async function CoverageTab() {
  // One server call each (the page is owner-only; the layout checks the session).
  let rows: CoverageRow[];
  let today: Record<string, { q: number; backlog: number }>;
  try {
    [rows, today] = await Promise.all([ox.coverage(), ox.nicheStats()]);
  } catch (e) {
    return <Failed what="coverage" message={(e as Error).message} />;
  }
  return <Coverage p={progress(rows)} today={today} target={DAILY_TARGET_PER_NICHE} />;
}

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; p?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = sp.p ? "all" : ((TABS.find(([k]) => k === sp.tab)?.[0] ?? "ready") as Tab);
  const page = Math.max(0, Number.parseInt(sp.page ?? "0", 10) || 0);
  return (
    <main className="adm-page">
      <PageHead title="Prospects" text="Small businesses found on OpenStreetMap, area by area, audited and emailed from your outreach Gmail on autopilot. Only uncertain emails wait for you in Needs a look." />
      <Suspense fallback={<SkeletonCard rows={3} title={false} />}>
        <Controls />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={4} title={false} />}>
        <Pipeline />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={2} title={false} />}>
        <Numbers />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={1} title={false} />}>
        <Tabs active={tab} />
      </Suspense>
      <Suspense key={`${tab}-${page}`} fallback={<SkeletonCard rows={8} />}>
        {tab === "ready" && <Ready page={page} />}
        {tab === "map" && <MapTab />}
        {tab === "coverage" && <CoverageTab />}
        {tab === "sent" && <Sent page={page} />}
        {tab === "hot" && <Hot />}
        {tab === "whatsapp" && <Queue />}
        {tab === "suppressed" && <Suppressed page={page} />}
        {tab === "all" && <All openId={sp.p ?? null} />}
      </Suspense>
    </main>
  );
}
