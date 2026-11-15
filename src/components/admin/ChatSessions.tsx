"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/admin/labels";
import { getTranscript, loadChatSessions, type TranscriptMessage } from "@/app/admin/(dashboard)/actions";
import type { ChatSessionRow } from "@/lib/admin/data";
import Transcript from "./Transcript";

/** Chat sessions, 50 at a time; open one to load its full transcript. */
const ChatSessions = ({ initial, total }: { initial: ChatSessionRow[]; total: number }) => {
  const [sessions, setSessions] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptMessage[]>>({});
  const [loading, start] = useTransition();

  const toggle = (id: string) => {
    setOpen((current) => (current === id ? null : id));
    if (!transcripts[id]) getTranscript(id).then((messages) => setTranscripts((t) => ({ ...t, [id]: messages })));
  };
  const more = () =>
    start(async () => {
      const next = await loadChatSessions(sessions.length);
      setSessions((s) => [...s, ...next.filter((x) => !s.some((y) => y.id === x.id))]);
    });

  return (
    <>
      <ul className="adm-sessions">
        {sessions.map((s) => (
          <li key={s.id} className={open === s.id ? "is-open" : ""}>
            <button type="button" className="adm-session" onClick={() => toggle(s.id)} aria-expanded={open === s.id}>
              <span className="adm-session-q">{s.first_question || <em>No question saved</em>}</span>
              <span className="adm-session-meta">
                <span>{formatDate(s.created_at)}</span>
                <span>{s.message_count} messages</span>
                {s.first_page && <span>{s.first_page}</span>}
              </span>
              {s.lead_id ? <span className="adm-badge is-won">Became a lead</span> : <span className="adm-badge is-muted">No lead</span>}
            </button>
            {open === s.id && (
              <div className="adm-session-body">
                {s.lead_id && (
                  <Link href={`/admin/leads?lead=${s.lead_id}`} className="adm-link">
                    Open the lead →
                  </Link>
                )}
                {transcripts[s.id] ? <Transcript messages={transcripts[s.id]} /> : <p className="adm-muted">Loading the chat…</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {sessions.length < total && (
        <div className="adm-more">
          <button type="button" className="adm-btn" onClick={more} disabled={loading}>
            {loading ? "Loading…" : `Load more (${total - sessions.length} left)`}
          </button>
        </div>
      )}
    </>
  );
};

export default ChatSessions;
