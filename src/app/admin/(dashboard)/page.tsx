import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SERVICE_GROUPS, SOURCES, SOURCE_LABELS, formatDate, serviceLabel, serviceOf } from "@/lib/admin/labels";
import { getOverview } from "@/lib/admin/data";
import { BarList, Change, EmptyState, PageHead, StatCard, StatusBadge } from "@/components/admin/ui";
import { SkeletonCard, SkeletonStats } from "@/components/admin/Skeleton";
import RefreshButton from "@/components/admin/RefreshButton";
import { TOOLS } from "@/data/tools";

// The chart is the only client-side code on this page: load it separately.
const DailyBars = dynamic(() => import("@/components/admin/DailyBars"));

// Site events (src/lib/analytics.ts): written by the server (chat, leads, audits) and by /api/events.
const EVENTS = [
  { name: "chat_started", label: "Chats started" },
  { name: "lead_submitted", label: "Leads submitted" },
  { name: "tool_used", label: "Tools used" },
  { name: "audit_run", label: "SEO audits run" },
  { name: "whatsapp_clicked", label: "WhatsApp clicks" },
  { name: "cv_downloaded", label: "CV downloads" },
  { name: "audit_cta_click", label: "Audit CTA clicks" },
] as const;
const CTA_LABELS: Record<string, string> = { nav: "Navbar", home: "Home page", blog: "Blog posts", service: "Service pages", solution: "Industry pages" };

export const metadata: Metadata = { title: "Overview" };

const pct = (won: number, all: number) => (all ? (won / all) * 100 : 0);

/** Stat cards: first on screen. All numbers come from one cached SQL call (app_admin_overview). */
async function Stats() {
  const o = await getOverview();
  return (
    <section className="adm-stats" aria-label="Key numbers">
      <StatCard label="Total leads" value={String(o.leads_total)}>
        <Change current={o.leads_30} previous={o.leads_prev30} label="last 30 days vs the 30 before" />
      </StatCard>
      <StatCard label="New this week" value={String(o.week)}>
        <Change current={o.week} previous={o.prev_week} label="vs previous 7 days" />
      </StatCard>
      <StatCard label="Conversion rate" value={`${Math.round(pct(o.won_total, o.leads_total))}%`}>
        {o.leads_30 && o.leads_prev30 ? (
          <Change current={pct(o.won_30, o.leads_30)} previous={pct(o.won_prev30, o.leads_prev30)} unit="pts" label="last 30 days vs the 30 before" />
        ) : (
          <Change current={0} previous={null} label="Won leads out of all leads" />
        )}
      </StatCard>
      <StatCard label="Chats today" value={String(o.chats_today)}>
        <Change current={o.chats_today} previous={o.chats_yesterday} label="vs yesterday" />
      </StatCard>
      <StatCard label="Chats this week" value={String(o.chats_week)}>
        <Change current={o.chats_week} previous={o.chats_prev_week} label="vs previous 7 days" />
      </StatCard>
    </section>
  );
}

async function Details() {
  const o = await getOverview();
  const byTool = TOOLS.map((t) => ({ label: t.name, value: o.tools[t.slug] ?? 0 }));
  const toolTotal = byTool.reduce((s, t) => s + t.value, 0);
  const byCta = Object.entries(CTA_LABELS).map(([key, label]) => ({ label, value: o.cta[key] ?? 0 }));
  const ctaTotal = byCta.reduce((s, t) => s + t.value, 0);
  const bySource = SOURCES.map((s) => ({ label: SOURCE_LABELS[s], value: o.by_source[s] ?? 0 }));
  const byService = SERVICE_GROUPS.map((g) => ({
    label: g.label,
    value: o.by_project_type.filter((p) => serviceOf(p.project_type) === g.key).reduce((s, p) => s + p.count, 0),
  }));
  const outreach = [
    { label: "Businesses found", value: o.outreach.found },
    { label: "Emails sent", value: o.outreach.sent },
    { label: "Replies", value: o.outreach.replies },
    { label: "Bounces", value: o.outreach.bounces },
    { label: "Unsubscribes", value: o.outreach.unsubscribes },
  ];

  return (
    <>
      <section className="adm-card adm-span-2">
        <div className="adm-card-head">
          <h2>Leads per day</h2>
          <span>
            Last 30 days · {o.leads_30} lead{o.leads_30 === 1 ? "" : "s"}
          </span>
        </div>
        {o.leads_30 ? (
          <DailyBars days={o.per_day} />
        ) : (
          <EmptyState icon="chart" title="No leads in the last 30 days" text="New leads from the chat and the contact form will show up here day by day." compact />
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Site events</h2>
          <span>Last 30 days vs the 30 before</span>
        </div>
        <div className="adm-events">
          {EVENTS.map((e) => (
            <div key={e.name} className="adm-event">
              <span>{e.label}</span>
              <strong>{o.events[e.name]?.cur ?? 0}</strong>
              <Change current={o.events[e.name]?.cur ?? 0} previous={o.events[e.name]?.prev ?? 0} label="" />
            </div>
          ))}
        </div>
        {toolTotal > 0 && (
          <div className="adm-events-tools">
            <h3>Tools used, by tool</h3>
            <BarList rows={byTool} total={toolTotal} />
          </div>
        )}
        {ctaTotal > 0 && (
          <div className="adm-events-tools">
            <h3>Audit CTA clicks, by location</h3>
            <BarList rows={byCta} total={ctaTotal} />
          </div>
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Outreach</h2>
          <span>
            Last 30 days · <Link href="/admin/prospects">Open prospects</Link>
          </span>
        </div>
        <div className="adm-events">
          {outreach.map((x) => (
            <div key={x.label} className="adm-event">
              <span>{x.label}</span>
              <strong>{x.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Leads by source</h2>
            <span>All time</span>
          </div>
          {o.leads_total ? (
            <BarList rows={bySource} total={o.leads_total} />
          ) : (
            <EmptyState icon="chart" title="Nothing to compare yet" text="You'll see whether leads come from the chatbot, the contact form or tools." compact />
          )}
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Leads by service</h2>
            <span>All time</span>
          </div>
          {o.leads_total ? (
            <BarList rows={byService} total={o.leads_total} />
          ) : (
            <EmptyState icon="chart" title="Nothing to compare yet" text="Websites, dashboards, AI chatbots or SEO: which one people ask for most." compact />
          )}
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Latest leads</h2>
          {o.latest.length > 0 && <Link href="/admin/leads">View all →</Link>}
        </div>
        {o.latest.length ? (
          <ul className="adm-latest">
            {o.latest.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/leads?lead=${l.id}`}>
                  <span className="adm-latest-main">
                    <strong>{l.name}</strong>
                    <small>
                      {serviceLabel(l.project_type)} · {SOURCE_LABELS[l.source] ?? l.source}
                    </small>
                  </span>
                  <span className="adm-latest-side">
                    <StatusBadge status={l.status} />
                    <small>{formatDate(l.created_at, false)}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="leads" title="No leads yet" text="When someone sends their details through the chat or the contact form, they'll appear here.">
            <a href="/contact" className="adm-btn" target="_blank" rel="noreferrer">
              Open the contact page
            </a>
          </EmptyState>
        )}
      </section>
    </>
  );
}

export default function OverviewPage() {
  return (
    <main className="adm-page">
      <PageHead title="Overview" text={`Leads and chats on hamzatariq.site · ${formatDate(new Date().toISOString(), false)}`}>
        <RefreshButton />
      </PageHead>
      <Suspense fallback={<SkeletonStats />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={8} />}>
        <Details />
      </Suspense>
    </main>
  );
}
