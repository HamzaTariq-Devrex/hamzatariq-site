"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/admin/labels";
import { getTranscript, type TranscriptMessage } from "@/app/admin/(dashboard)/actions";
import Transcript from "./Transcript";

type Session = { id: string; createdAt: string; page: string | null; messages: number; firstQuestion: string; leadId: string | null };

/** Chat sessions; open one to load its full transcript. */
const ChatSessions = ({ sessions }: { sessions: Session[] }) => {
  const [open, setOpen] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptMessage[]>>({});

  const toggle = (id: string) => {
    setOpen((current) => (current === id ? null : id));
    if (!transcripts[id]) getTranscript(id).then((messages) => setTranscripts((t) => ({ ...t, [id]: messages })));
  };

  return (
    <ul className="adm-sessions">
      {sessions.map((s) => (
        <li key={s.id} className={open === s.id ? "is-open" : ""}>
          <button type="button" className="adm-session" onClick={() => toggle(s.id)} aria-expanded={open === s.id}>
            <span className="adm-session-q">{s.firstQuestion || <em>No question saved</em>}</span>
            <span className="adm-session-meta">
              <span>{formatDate(s.createdAt)}</span>
              <span>{s.messages} messages</span>
              {s.page && <span>{s.page}</span>}
            </span>
            {s.leadId ? <span className="adm-badge is-won">Became a lead</span> : <span className="adm-badge is-muted">No lead</span>}
          </button>
          {open === s.id && (
            <div className="adm-session-body">
              {s.leadId && (
                <Link href={`/admin/leads?lead=${s.leadId}`} className="adm-link">
                  Open the lead →
                </Link>
              )}
              {transcripts[s.id] ? <Transcript messages={transcripts[s.id]} /> : <p className="adm-muted">Loading the chat…</p>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ChatSessions;
