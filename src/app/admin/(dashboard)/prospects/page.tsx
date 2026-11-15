import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache } from "react";
import { getOwner } from "@/lib/supabase/server";
import { PAGE_SIZE, getOutreachStats, getProspectStats } from "@/lib/admin/data";
import { formatDate } from "@/lib/admin/labels";
import { PageHead } from "@/components/admin/ui";
import { SkeletonCard } from "@/components/admin/Skeleton";
import OutreachControls from "@/components/admin/outreach/OutreachControls";
import OutreachStats from "@/components/admin/outreach/OutreachStats";
import SearchManager from "@/components/admin/outreach/SearchManager";
import DraftQueue, { type Draft } from "@/components/admin/outreach/DraftQueue";
import ProspectsBrowser from "@/components/admin/outreach/ProspectsBrowser";
import WhatsAppQueue, { type QueueItem } from "@/components/admin/outreach/WhatsAppQueue";
import { typeLabel } from "@/components/admin/outreach/prospect-shared";
import { dailyCap } from "@/lib/outreach/pipeline";
import { manualMessage } from "@/lib/outreach/compose";
import type { AuditResult } from "@/lib/audit/types";
import { listProspects } from "./actions";

export const metadata: Metadata = { title: "Prospects" };

const DAYS = 14;
const TABS = [
  ["ready", "Ready to approve"],
  ["sent", "Sent"],
  ["hot", "Hot replies"],
  ["whatsapp", "WhatsApp queue"],
  ["suppressed", "Suppressed"],
  ["all", "All prospects"],
] as const;
type Tab = (typeof TABS)[number][0];
const STEP = ["Email 1", "Day 3", "Day 7", "Reply", "Check-back"];
const DRAFT_COLUMNS = "id, step, subject, body, created_at, variant, prospect:prospects(id, name, email, city, business_type, audit_score, lead_score)";

// Each section loads on its own and streams in; shared calls run once per request.
const stats = cache(() => getOutreachStats());
const dayStats = cache(() => getProspectStats(DAYS));
const db = async () => (await getOwner())!.supabase; // the layout redirects when signed out
const settings = cache(async () => (await db()).from("outreach_settings").select("paused, pause_reason, approve_first, started_at, next_send_at, last_imap_at").eq("id", 1).single());

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
  const [{ data: s, error }, st] = await Promise.all([settings(), dayStats()]);
  if (error || !s) return <Failed what="outreach settings" message={error?.message ?? "missing"} />;
  return (
    <OutreachControls
      settings={{ paused: s.paused, pauseReason: s.pause_reason, approveFirst: s.approve_first, startedAt: s.started_at, nextSendAt: s.next_send_at, lastImapAt: s.last_imap_at }}
      sent24h={st.sent_24h}
      cap={dailyCap(s.started_at)}
    />
  );
}

async function Numbers() {
  return <OutreachStats s={await stats()} />;
}

async function Tabs({ active }: { active: Tab }) {
  const s = await stats();
  const count: Record<Tab, number | null> = { ready: s.tabs.ready, sent: s.tabs.sent, hot: s.tabs.hot, whatsapp: s.tabs.whatsapp, suppressed: s.tabs.suppressed, all: null };
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
  const supabase = await db();
  const [{ data, error, count }, { data: s }] = await Promise.all([
    supabase
      .from("outreach_messages")
      .select(DRAFT_COLUMNS, { count: "exact" })
      .eq("status", "draft")
      .eq("direction", "out")
      .order("step", { ascending: false })
      .order("created_at")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1),
    settings(),
  ]);
  if (error) return <Failed what="drafts" message={error.message} />;
  return (
    <>
      <DraftQueue drafts={(data ?? []) as unknown as Draft[]} approveFirst={s?.approve_first ?? true} />
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
  const [{ data: people, error }, { data: drafts }, { data: s }] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, name, email, phone, business_type, city, reply_class, updated_at, lead_id")
      .in("reply_class", ["interested", "question"])
      .not("status", "in", "(won,lost)")
      .order("updated_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase.from("outreach_messages").select(DRAFT_COLUMNS).eq("status", "draft").eq("direction", "out").eq("step", 3).order("created_at").limit(PAGE_SIZE),
    settings(),
  ]);
  if (error) return <Failed what="hot replies" message={error.message} />;
  return (
    <>
      <DraftQueue drafts={(drafts ?? []) as unknown as Draft[]} approveFirst={s?.approve_first ?? true} />
      <section className="adm-card">
        <div className="adm-card-head">
          <h2>People who replied</h2>
          <span className="adm-muted">Interested or asked a question</span>
        </div>
        {people?.length ? (
          <ul className="ox-searches">
            {people.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span className="adm-muted">
                    {p.reply_class === "question" ? "Asked a question" : "Interested"} · {p.email}
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
          <p className="adm-muted">No hot replies yet. Interested replies and questions appear here, with a reply draft for you to approve.</p>
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
    .select("email, reason, created_at, prospect:prospects(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) return <Failed what="the suppression list" message={error.message} />;
  type Row = { email: string; reason: string; created_at: string; prospect: { name: string } | null };
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
                <th scope="col">Since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email}>
                  <td>{r.email}</td>
                  <td>{r.prospect?.name ?? "–"}</td>
                  <td>{r.reason}</td>
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
  const [{ data: searches, error }, st, first, ds] = await Promise.all([
    (await db()).from("outreach_searches").select("id, business_type, city, country, active, timezone, last_run_at, last_found").order("created_at"),
    stats(),
    listProspects("all", "", 0),
    dayStats(),
  ]);
  if (error) return <Failed what="saved searches" message={error.message} />;
  return (
    <>
      <ProspectsBrowser initial={first.rows} total={first.total} counts={{ ...ds.by_status, all: ds.total }} initialId={openId} />
      <div className="adm-grid-2">
        <SearchManager searches={searches ?? []} />
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

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; p?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = sp.p ? "all" : ((TABS.find(([k]) => k === sp.tab)?.[0] ?? "ready") as Tab);
  const page = Math.max(0, Number.parseInt(sp.page ?? "0", 10) || 0);
  return (
    <main className="adm-page">
      <PageHead title="Prospects" text="Small businesses found on OpenStreetMap, audited and emailed from your outreach Gmail. Nothing is sent until you approve it." />
      <Suspense fallback={<SkeletonCard rows={3} title={false} />}>
        <Controls />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={2} title={false} />}>
        <Numbers />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={1} title={false} />}>
        <Tabs active={tab} />
      </Suspense>
      <Suspense key={`${tab}-${page}`} fallback={<SkeletonCard rows={8} />}>
        {tab === "ready" && <Ready page={page} />}
        {tab === "sent" && <Sent page={page} />}
        {tab === "hot" && <Hot />}
        {tab === "whatsapp" && <Queue />}
        {tab === "suppressed" && <Suppressed page={page} />}
        {tab === "all" && <All openId={sp.p ?? null} />}
      </Suspense>
    </main>
  );
}
