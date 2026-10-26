import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/supabase/server";
import { signOut, type LeadStatus } from "./actions";
import StatusSelect from "./StatusSelect";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

export default async function LeadsPage() {
  const owner = await getOwner();
  if (!owner) redirect("/admin/login");
  const { supabase, user } = owner;

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const sessions = [...new Set((leads ?? []).map((l) => l.session_id).filter((s): s is string => !!s))];
  const { data: messages } = sessions.length
    ? await supabase
        .from("chat_messages")
        .select("session_id, role, content, created_at")
        .in("session_id", sessions)
        .order("created_at")
    : { data: [] };
  const transcripts = new Map<string, NonNullable<typeof messages>>();
  for (const m of messages ?? []) transcripts.set(m.session_id, [...(transcripts.get(m.session_id) ?? []), m]);

  const counts = (leads ?? []).reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {});

  return (
    <main className="admin-main">
      <header className="admin-head">
        <div>
          <span className="page-eyebrow">Admin</span>
          <h1>Leads</h1>
          <p className="admin-summary">
            {leads?.length ?? 0} total · {counts.new ?? 0} new · {counts.replied ?? 0} replied · {counts.won ?? 0} won ·{" "}
            {counts.lost ?? 0} lost
          </p>
        </div>
        <form action={signOut} className="admin-account">
          <span>{user.email}</span>
          <button type="submit" className="page-btn page-btn-ghost">
            Sign out
          </button>
        </form>
      </header>

      {error && (
        <p className="admin-error" role="alert">
          Could not load leads: {error.message}
        </p>
      )}
      {leads && leads.length === 0 && <p className="admin-note">No leads yet.</p>}

      <ul className="admin-leads">
        {leads?.map((lead) => {
          const transcript = lead.session_id ? transcripts.get(lead.session_id) : undefined;
          return (
            <li key={lead.id} id={`lead-${lead.id}`} className="admin-lead">
              <div className="admin-lead-top">
                <div>
                  <strong>{lead.name}</strong>
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </div>
                <StatusSelect id={lead.id} status={lead.status as LeadStatus} />
              </div>
              <dl className="admin-lead-meta">
                <div>
                  <dt>Received</dt>
                  <dd>{dateFormat.format(new Date(lead.created_at))}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>
                    <span className={`admin-source is-${lead.source}`}>{lead.source}</span>
                  </dd>
                </div>
                <div>
                  <dt>Project</dt>
                  <dd>{lead.project_type ?? "-"}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{lead.budget ?? "-"}</dd>
                </div>
                <div>
                  <dt>Page</dt>
                  <dd>{lead.page || "-"}</dd>
                </div>
                <div>
                  <dt>Email sent</dt>
                  <dd>{lead.notified_at ? "Yes" : "No"}</dd>
                </div>
              </dl>
              {lead.message && <p className="admin-lead-message">{lead.message}</p>}
              {transcript && transcript.length > 0 && (
                <details className="admin-transcript">
                  <summary>Chat transcript ({transcript.length} messages)</summary>
                  <ol>
                    {transcript.map((m, i) => (
                      <li key={i} className={`is-${m.role}`}>
                        <span>{m.role === "user" ? "Visitor" : "AI"}</span>
                        <p>{m.content}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
