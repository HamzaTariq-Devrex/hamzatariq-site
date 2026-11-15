import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { OFF_TOPIC_REPLY } from "@/lib/assistant/offline";
import { PAGE_SIZE, getChatSessions, getChatStats } from "@/lib/admin/data";
import ChatSessions from "@/components/admin/ChatSessions";
import { EmptyState, PageHead, StatCard } from "@/components/admin/ui";
import { SkeletonCard, SkeletonStats } from "@/components/admin/Skeleton";

export const metadata: Metadata = { title: "Chats" };

const TOP_WINDOW_DAYS = 90;
// Greetings and thanks aren't questions worth writing about (applied in Postgres, case-insensitive).
const SMALL_TALK = "^(hi+|hello|hey|salam|assalam ?o? ?alaikum|aoa|thanks?|thank you|shukriya|ok(ay)?|yes|no|acha|theek)\\W*$";

// Numbers and top questions: one SQL call (app_admin_chats), counted and grouped in Postgres.
// One call per request, shared by the three streamed sections.
const stats = cache(() => getChatStats(TOP_WINDOW_DAYS, OFF_TOPIC_REPLY, SMALL_TALK));

async function Numbers() {
  const s = await stats();
  const share = (n: number) => (s.questions ? ` · ${Math.round((n / s.questions) * 100)}% of questions` : "");
  return (
    <section className="adm-stats" aria-label="Chat numbers">
      <StatCard label="Chats" value={String(s.total_chats)}>
        <span className="adm-change">All time</span>
      </StatCard>
      <StatCard label="Questions asked" value={String(s.questions)}>
        <span className="adm-change">Visitor messages</span>
      </StatCard>
      <StatCard label="Off-topic" value={String(s.off_topic)}>
        <span className="adm-change">Declined{share(s.off_topic)}</span>
      </StatCard>
      <StatCard label="Saved answers" value={String(s.saved)}>
        <span className="adm-change">Gemini unavailable{share(s.saved)}</span>
      </StatCard>
      <StatCard label="Answer personally" value={String(s.personal)}>
        <span className="adm-change">No saved answer matched</span>
      </StatCard>
    </section>
  );
}

async function TopQuestions() {
  const { top } = await stats();
  return (
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
              <span className="adm-top-count">{q.count}×</span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon="chats" title="No questions yet" text="The questions visitors ask most will be listed here, so you know what to write about." compact />
      )}
    </section>
  );
}

async function Sessions() {
  const [first, s] = await Promise.all([getChatSessions(0, PAGE_SIZE), stats()]);
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>Chat sessions</h2>
        <span>{s.total_chats} total</span>
      </div>
      {first.length ? (
        <ChatSessions initial={first} total={s.total_chats} />
      ) : (
        <EmptyState icon="chats" title="No chats yet" text="When visitors talk to Hamza's AI on the site, each conversation shows up here." compact />
      )}
    </section>
  );
}

export default function ChatsPage() {
  return (
    <main className="adm-page">
      <PageHead title="Chats" text="What visitors ask Hamza's AI, and how it answered." />
      <Suspense fallback={<SkeletonStats />}>
        <Numbers />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={8} />}>
        <TopQuestions />
      </Suspense>
      <Suspense fallback={<SkeletonCard rows={6} />}>
        <Sessions />
      </Suspense>
    </main>
  );
}
