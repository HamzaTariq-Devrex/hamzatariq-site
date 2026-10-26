import type { Metadata } from "next";
import Link from "next/link";
import { getOwner } from "@/lib/supabase/server";
import { DAY_MS, SERVICE_GROUPS, SOURCES, SOURCE_LABELS, formatDate, pktDay, pktStartOfToday, serviceLabel, serviceOf } from "@/lib/admin/labels";
import DailyBars from "@/components/admin/DailyBars";
import { BarList, Change, EmptyState, PageHead, StatCard, StatusBadge } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Overview" };

const between = (iso: string, from: number, to: number) => {
  const t = new Date(iso).getTime();
  return t >= from && t < to;
};

export default async function OverviewPage() {
  const { supabase } = (await getOwner())!; // the layout redirects when signed out
  const now = Date.now();
  const today = pktStartOfToday(now);
  const tomorrow = today + DAY_MS;

  const [{ data: leadRows }, { data: sessionRows }] = await Promise.all([
    supabase.from("leads").select("id, name, project_type, source, status, created_at").order("created_at", { ascending: false }).limit(5000),
    supabase.from("chat_sessions").select("created_at").gte("created_at", new Date(today - 13 * DAY_MS).toISOString()).limit(10000),
  ]);
  const leads = leadRows ?? [];
  const sessions = sessionRows ?? [];

  // Periods: the last 7 / 30 days (including today) against the 7 / 30 days before them.
  const inDays = (rows: { created_at: string }[], from: number, to: number) => rows.filter((r) => between(r.created_at, from, to)).length;
  const last30 = leads.filter((l) => between(l.created_at, tomorrow - 30 * DAY_MS, tomorrow));
  const prev30 = leads.filter((l) => between(l.created_at, tomorrow - 60 * DAY_MS, tomorrow - 30 * DAY_MS));
  const conversion = (rows: { status: string }[]) => (rows.length ? (rows.filter((r) => r.status === "won").length / rows.length) * 100 : 0);
  const week = inDays(leads, tomorrow - 7 * DAY_MS, tomorrow);
  const prevWeek = inDays(leads, tomorrow - 14 * DAY_MS, tomorrow - 7 * DAY_MS);
  const chatsToday = inDays(sessions, today, tomorrow);
  const chatsYesterday = inDays(sessions, today - DAY_MS, today);
  const chatsWeek = inDays(sessions, tomorrow - 7 * DAY_MS, tomorrow);
  const chatsPrevWeek = inDays(sessions, tomorrow - 14 * DAY_MS, tomorrow - 7 * DAY_MS);

  const perDay = new Map<string, number>();
  for (const l of last30) perDay.set(pktDay(l.created_at), (perDay.get(pktDay(l.created_at)) ?? 0) + 1);
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = pktDay(new Date(today - (29 - i) * DAY_MS + DAY_MS / 2));
    return { day, count: perDay.get(day) ?? 0 };
  });

  const bySource = SOURCES.map((s) => ({ label: SOURCE_LABELS[s], value: leads.filter((l) => l.source === s).length }));
  const byService = SERVICE_GROUPS.map((g) => ({ label: g.label, value: leads.filter((l) => serviceOf(l.project_type) === g.key).length }));

  return (
    <main className="adm-page">
      <PageHead title="Overview" text={`Leads and chats on hamzatariq.site · ${formatDate(new Date(now).toISOString(), false)}`} />

      <section className="adm-stats" aria-label="Key numbers">
        <StatCard label="Total leads" value={String(leads.length)}>
          <Change current={last30.length} previous={prev30.length} label="last 30 days vs the 30 before" />
        </StatCard>
        <StatCard label="New this week" value={String(week)}>
          <Change current={week} previous={prevWeek} label="vs previous 7 days" />
        </StatCard>
        <StatCard label="Conversion rate" value={`${Math.round(conversion(leads))}%`}>
          {last30.length && prev30.length ? (
            <Change current={conversion(last30)} previous={conversion(prev30)} unit="pts" label="last 30 days vs the 30 before" />
          ) : (
            <Change current={0} previous={null} label="Won leads out of all leads" />
          )}
        </StatCard>
        <StatCard label="Chats today" value={String(chatsToday)}>
          <Change current={chatsToday} previous={chatsYesterday} label="vs yesterday" />
        </StatCard>
        <StatCard label="Chats this week" value={String(chatsWeek)}>
          <Change current={chatsWeek} previous={chatsPrevWeek} label="vs previous 7 days" />
        </StatCard>
      </section>

      <section className="adm-card adm-span-2">
        <div className="adm-card-head">
          <h2>Leads per day</h2>
          <span>Last 30 days · {last30.length} lead{last30.length === 1 ? "" : "s"}</span>
        </div>
        {last30.length ? (
          <DailyBars days={days} />
        ) : (
          <EmptyState icon="chart" title="No leads in the last 30 days" text="New leads from the chat and the contact form will show up here day by day." compact />
        )}
      </section>

      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Leads by source</h2>
            <span>All time</span>
          </div>
          {leads.length ? (
            <BarList rows={bySource} total={leads.length} />
          ) : (
            <EmptyState icon="chart" title="Nothing to compare yet" text="You'll see whether leads come from the chatbot, the contact form or tools." compact />
          )}
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Leads by service</h2>
            <span>All time</span>
          </div>
          {leads.length ? (
            <BarList rows={byService} total={leads.length} />
          ) : (
            <EmptyState icon="chart" title="Nothing to compare yet" text="Websites, dashboards, AI chatbots or SEO: which one people ask for most." compact />
          )}
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Latest leads</h2>
          {leads.length > 0 && <Link href="/admin/leads">View all →</Link>}
        </div>
        {leads.length ? (
          <ul className="adm-latest">
            {leads.slice(0, 5).map((l) => (
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
    </main>
  );
}
