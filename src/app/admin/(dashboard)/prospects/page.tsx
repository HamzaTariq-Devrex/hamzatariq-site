import type { Metadata } from "next";
import { getOwner } from "@/lib/supabase/server";
import { DAY_MS, pktDay, pktStartOfToday } from "@/lib/admin/labels";
import { PageHead } from "@/components/admin/ui";
import OutreachControls from "@/components/admin/outreach/OutreachControls";
import SearchManager from "@/components/admin/outreach/SearchManager";
import DraftQueue, { type Draft } from "@/components/admin/outreach/DraftQueue";
import ProspectsBrowser, { type ProspectRow } from "@/components/admin/outreach/ProspectsBrowser";
import WhatsAppQueue from "@/components/admin/outreach/WhatsAppQueue";
import { dailyCap } from "@/lib/outreach/pipeline";

export const metadata: Metadata = { title: "Prospects" };

const DAYS = 14;

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { supabase } = (await getOwner())!; // the layout redirects when signed out
  const since = new Date(pktStartOfToday() - (DAYS - 1) * DAY_MS).toISOString();
  const [{ p }, settingsRes, searchesRes, draftsRes, prospectsRes, messagesRes] = await Promise.all([
    searchParams,
    supabase.from("outreach_settings").select("*").eq("id", 1).single(),
    supabase.from("outreach_searches").select("*").order("created_at"),
    supabase
      .from("outreach_messages")
      .select("id, step, subject, body, created_at, prospect:prospects(id, name, email, city, business_type, audit_score, lead_score)")
      .eq("status", "draft")
      .eq("direction", "out")
      .order("created_at")
      .limit(500),
    supabase
      .from("prospects")
      .select("*, audits:prospect_audits(report_id, score, final_url, created_at, expires_at)")
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase.from("outreach_messages").select("direction, kind, status, sent_at, created_at").gte("created_at", since).limit(20000),
  ]);

  const error = settingsRes.error ?? searchesRes.error ?? draftsRes.error ?? prospectsRes.error ?? messagesRes.error;
  if (error || !settingsRes.data) {
    return (
      <main className="adm-page">
        <PageHead title="Prospects" />
        <p className="adm-error" role="alert">
          Could not load outreach data: {error?.message ?? "settings missing"}. Is the outreach migration applied?
        </p>
      </main>
    );
  }

  const settings = settingsRes.data;
  const prospects = (prospectsRes.data ?? []) as unknown as ProspectRow[];
  const messages = messagesRes.data ?? [];
  const sent24h = messages.filter((m) => m.direction === "out" && m.status === "sent" && m.sent_at && Date.parse(m.sent_at) > Date.now() - DAY_MS).length;

  // Daily stats, Pakistan calendar days, newest first.
  const days = Array.from({ length: DAYS }, (_, i) => pktDay(new Date(pktStartOfToday() - i * DAY_MS)));
  const stats = days.map((day) => ({
    day,
    found: prospects.filter((x) => pktDay(x.created_at) === day).length,
    emailed: messages.filter((m) => m.direction === "out" && m.status === "sent" && m.sent_at && pktDay(m.sent_at) === day).length,
    replied: messages.filter((m) => m.direction === "in" && m.kind === "reply" && pktDay(m.created_at) === day).length,
    bounced: messages.filter((m) => m.direction === "in" && m.kind === "bounce" && pktDay(m.created_at) === day).length,
    unsubscribed: messages.filter((m) => m.direction === "in" && m.kind === "unsubscribe" && pktDay(m.created_at) === day).length,
  }));

  return (
    <main className="adm-page">
      <PageHead
        title="Prospects"
        text="Businesses found on OpenStreetMap, audited and emailed from your outreach Gmail. WhatsApp stays manual."
      />
      <OutreachControls
        settings={{
          paused: settings.paused,
          pauseReason: settings.pause_reason,
          approveFirst: settings.approve_first,
          startedAt: settings.started_at,
          nextSendAt: settings.next_send_at,
          lastImapAt: settings.last_imap_at,
        }}
        sent24h={sent24h}
        cap={dailyCap(settings.started_at)}
      />
      <DraftQueue drafts={(draftsRes.data ?? []) as unknown as Draft[]} approveFirst={settings.approve_first} />
      <WhatsAppQueue prospects={prospects.filter((x) => x.status === "whatsapp").sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))} />
      <div className="adm-grid-2">
        <SearchManager searches={searchesRes.data ?? []} />
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
                {stats.map((s) => (
                  <tr key={s.day}>
                    <td className="adm-nowrap">{s.day}</td>
                    <td>{s.found}</td>
                    <td>{s.emailed}</td>
                    <td>{s.replied}</td>
                    <td>{s.bounced}</td>
                    <td>{s.unsubscribed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <ProspectsBrowser prospects={prospects} initialId={p ?? null} />
    </main>
  );
}
