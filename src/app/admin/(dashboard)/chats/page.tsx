import type { Metadata } from "next";
import { getOwner } from "@/lib/supabase/server";
import { DAY_MS } from "@/lib/admin/labels";
import { OFF_TOPIC_REPLY } from "@/lib/assistant/offline";
import ChatSessions from "@/components/admin/ChatSessions";
import { EmptyState, PageHead, StatCard } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Chats" };

const SESSIONS_SHOWN = 200;
const TOP_WINDOW_DAYS = 90;
// Greetings and thanks aren't questions worth writing about.
const SMALL_TALK = /^(hi+|hello|hey|salam|assalam ?o? ?alaikum|aoa|thanks?|thank you|shukriya|ok(ay)?|yes|no|acha|theek)\W*$/i;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}$ ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export default async function ChatsPage() {
  const { supabase } = (await getOwner())!; // the layout redirects when signed out
  const since = new Date(Date.now() - TOP_WINDOW_DAYS * DAY_MS).toISOString();
  const base = () => supabase.from("chat_messages").select("id", { count: "exact", head: true });
  const count = (filter: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => filter(base()).then((r) => r.count ?? 0);

  const [{ data: sessionRows, count: totalChats }, { data: recentMessages }, questions, offTopic, saved, personal] = await Promise.all([
    supabase
      .from("chat_sessions")
      .select("id, created_at, first_page, message_count", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(SESSIONS_SHOWN),
    supabase
      .from("chat_messages")
      .select("session_id, role, content")
      .gte("created_at", since)
      .order("session_id")
      .order("created_at")
      .order("id")
      .limit(10000),
    count((q) => q.eq("role", "user")),
    // Declined questions: from Gemini or the answer bank, the reply starts with the same fixed line.
    count((q) => q.eq("role", "assistant").like("content", `${OFF_TOPIC_REPLY}%`)),
    count((q) => q.eq("role", "assistant").like("content", "%[offline:%")),
    count((q) => q.eq("role", "assistant").like("content", "%[offline:personal]%")),
  ]);
  const sessions = sessionRows ?? [];
  const ids = sessions.map((s) => s.id);

  const [{ data: firstRows }, { data: leadRows }] = ids.length
    ? await Promise.all([
        supabase.from("chat_messages").select("session_id, content").eq("role", "user").in("session_id", ids).order("created_at").order("id"),
        supabase.from("leads").select("id, session_id").in("session_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const firstQuestion = new Map<string, string>();
  for (const m of firstRows ?? []) if (!firstQuestion.has(m.session_id)) firstQuestion.set(m.session_id, m.content);
  const leadBySession = new Map((leadRows ?? []).map((l) => [l.session_id!, l.id]));

  // Most asked: group the same question regardless of case and punctuation; show its most common wording.
  // Questions the assistant declined as off-topic are left out: they aren't blog ideas.
  const asked: string[] = [];
  const rows = recentMessages ?? [];
  rows.forEach((m, i) => {
    if (m.role !== "user") return;
    const reply = rows[i + 1];
    const declined = reply?.session_id === m.session_id && reply.role === "assistant" && reply.content.startsWith(OFF_TOPIC_REPLY);
    if (!declined) asked.push(m.content);
  });
  const groups = new Map<string, { count: number; wordings: Map<string, number> }>();
  for (const content of asked) {
    const text = content.trim();
    if (!text || SMALL_TALK.test(text)) continue;
    const key = normalize(text);
    if (!key) continue;
    const g = groups.get(key) ?? { count: 0, wordings: new Map() };
    g.count += 1;
    g.wordings.set(text, (g.wordings.get(text) ?? 0) + 1);
    groups.set(key, g);
  }
  const top = [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((g) => ({ text: [...g.wordings.entries()].sort((a, b) => b[1] - a[1])[0][0], count: g.count }));

  const share = (n: number) => (questions ? ` · ${Math.round((n / questions) * 100)}% of questions` : "");

  return (
    <main className="adm-page">
      <PageHead title="Chats" text="What visitors ask Hamza's AI, and how it answered." />

      <section className="adm-stats" aria-label="Chat numbers">
        <StatCard label="Chats" value={String(totalChats ?? 0)}>
          <span className="adm-change">All time</span>
        </StatCard>
        <StatCard label="Questions asked" value={String(questions)}>
          <span className="adm-change">Visitor messages</span>
        </StatCard>
        <StatCard label="Off-topic" value={String(offTopic)}>
          <span className="adm-change">Declined{share(offTopic)}</span>
        </StatCard>
        <StatCard label="Saved answers" value={String(saved)}>
          <span className="adm-change">Gemini unavailable{share(saved)}</span>
        </StatCard>
        <StatCard label="Answer personally" value={String(personal)}>
          <span className="adm-change">No saved answer matched</span>
        </StatCard>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Top 20 questions</h2>
          <span>Last {TOP_WINDOW_DAYS} days · ideas for blog posts</span>
        </div>
        {top.length ? (
          <ol className="adm-top">
            {top.map((q, i) => (
              <li key={q.text}>
                <span className="adm-top-rank">{i + 1}</span>
                <span className="adm-top-text">{q.text}</span>
                <span className="adm-top-count">
                  {q.count}×
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon="chats" title="No questions yet" text="The questions visitors ask most will be listed here, so you know what to write about." compact />
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Chat sessions</h2>
          <span>{sessions.length < (totalChats ?? 0) ? `Latest ${sessions.length} of ${totalChats}` : `${sessions.length} total`}</span>
        </div>
        {sessions.length ? (
          <ChatSessions
            sessions={sessions.map((s) => ({
              id: s.id,
              createdAt: s.created_at,
              page: s.first_page,
              messages: s.message_count,
              firstQuestion: firstQuestion.get(s.id) ?? "",
              leadId: leadBySession.get(s.id) ?? null,
            }))}
          />
        ) : (
          <EmptyState icon="chats" title="No chats yet" text="When visitors talk to Hamza's AI on the site, each conversation shows up here." compact />
        )}
      </section>
    </main>
  );
}
