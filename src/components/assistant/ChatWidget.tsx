"use client";

// "Ask Hamza's AI" chat widget, adapted from the /bot skill. Answers stream from /api/chat;
// when the visitor is ready to start, the reply carries a lead signal and the lead form opens in the chat.
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import LeadForm from "./LeadForm";
import "../styles/ChatWidget.css";

const BOT_NAME = "Hamza's AI";
const AVATAR = "/bot-avatar.svg";
const GREETING =
  "Hi, I'm Hamza's AI assistant. Ask me about his services, prices, past work or how a project works. I answer from this site.";
const SUGGESTIONS = [
  "What services does Hamza offer?",
  "How much does a Next.js website cost?",
  "Can you add an AI chatbot to my website?",
  "How do we start a project?",
];
const NUDGE_MESSAGES = [
  "👋 Questions about your project? Ask Hamza's AI.",
  "💡 Want to know what a website costs? Just ask.",
  "🤖 This assistant is one of Hamza's services. Try it.",
  "🚀 Ready to start? Leave your details right in the chat.",
];
const WHATSAPP_URL = SITE.social.whatsapp;
const HANDOFF_HELLO = "Hi Hamza! I was chatting with the assistant on your website.";
const LEAD_SIGNAL = "\u001eLEAD"; // same as LEAD_SIGNAL in src/lib/assistant/chat.ts

const STORAGE_KEY = "hamza-ai-chat-v1"; // conversation, kept for this browser tab session
const NUDGE_DELAY_MS = 2500; // first popup on every page load
const NUDGE_REPEAT_MS = 10000; // after a popup or the chat is closed, show the next one

type Message = { role: "user" | "assistant"; content: string };
type Saved = { session: string; messages: Message[]; leadSent: boolean };

const isMessage = (m: Message) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string";

// Opens WhatsApp with the visitor's questions pre-filled, so the lead reaches Hamza with context.
const whatsappHandoff = (messages: Message[]) => {
  const asked = messages
    .filter((m) => m.role === "user")
    .slice(-5)
    .map((m) => `- ${m.content.slice(0, 200)}`)
    .join("\n");
  const text = HANDOFF_HELLO + (asked ? `\n\nMy questions:\n${asked}` : "") + "\n\nI'd like to discuss my project.";
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
};

// Short, readable label for a URL: "WhatsApp", a page name from the path, or the domain.
const linkLabel = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname === "wa.me") return "WhatsApp";
    const slug = u.pathname.split("/").filter(Boolean).pop();
    if (!slug) return u.hostname.replace(/^www\./, "");
    const words = slug.replace(/[-_]+/g, " ").replace(/\bnextjs\b/i, "Next.js");
    return words.charAt(0).toUpperCase() + words.slice(1);
  } catch {
    return url;
  }
};

// Turns URLs in replies into links (same tab for this site, new tab for others); everything else stays text.
const Linkified = ({ text }: { text: string }) =>
  text.split(/(https?:\/\/[^\s)]+)/g).map((part, i) => {
    if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>;
    const url = part.replace(/[.,!?;:]+$/, "");
    const internal = url.startsWith(SITE.url);
    return (
      <span key={i}>
        <a href={url} {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="ai-chat-link">
          {linkLabel(url)}
          {internal ? " →" : " ↗"}
        </a>
        {part.slice(url.length)}
      </span>
    );
  });

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  // Real conversation only; the greeting is rendered separately.
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState("");
  const [leadSent, setLeadSent] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [nudge, setNudge] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [openedThisVisit, setOpenedThisVisit] = useState(false); // hides the "1" badge until reload
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Focus the input on desktop only; on phones the keyboard would cover the greeting and questions.
  useEffect(() => {
    if (open && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, [open]);

  // Full-screen chat on phones: stop the page behind it from scrolling.
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 640px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Wake the chat function when the visitor opens the chat, so their first reply isn't slowed by a cold start.
  useEffect(() => {
    if (open) fetch("/api/chat", { method: "GET" }).catch(() => {});
  }, [open]);

  // Grow the message box with its content (up to the CSS max-height).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }, [input, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the latest message in view, including when the buttons or the form appear below it.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, sending, error, formOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Restore the conversation after a page reload (per-tab, best effort).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as Saved | null;
      if (saved && Array.isArray(saved.messages) && saved.messages.every(isMessage)) {
        setMessages(saved.messages);
        setSession(saved.session || "");
        setLeadSent(!!saved.leadSent);
      }
    } catch {
      // storage unavailable: start fresh
    }
  }, []);

  useEffect(() => {
    if (sending) return;
    try {
      if (messages.length > 0) {
        const saved: Saved = { session, messages: messages.slice(-30), leadSent };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [messages, sending, session, leadSent]);

  // Message bubbles next to the launcher: the first appears on every page load, and whenever a
  // message or the chat is closed, the next message follows after NUDGE_REPEAT_MS.
  useEffect(() => {
    if (open || nudge) return;
    const t = setTimeout(() => setNudge(true), nudgeIndex === 0 ? NUDGE_DELAY_MS : NUDGE_REPEAT_MS);
    return () => clearTimeout(t);
  }, [open, nudge, nudgeIndex]);

  useEffect(() => {
    if (!open) return;
    setNudge(false);
    setNudgeIndex((i) => i + 1);
    setOpenedThisVisit(true);
  }, [open]);

  const dismissNudge = () => {
    setNudge(false);
    setNudgeIndex((i) => i + 1);
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSession("");
    setFormOpen(false);
    setError("");
    setInput("");
    setSending(false);
    inputRef.current?.focus();
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const id = session || crypto.randomUUID();
    if (!session) setSession(id);
    setError("");
    setInput("");
    setFormOpen(false);
    const history: Message[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          page: window.location.pathname,
          session: id,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Something went wrong.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      const visible = () => raw.split("\u001e")[0];
      // The provider sends text in a few large chunks; reveal it gradually so it reads like typing.
      const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let shown = 0;
      let streamDone = false;
      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          if (controller.signal.aborted) {
            clearInterval(timer);
            return;
          }
          const reply = visible();
          if (shown < reply.length) {
            const step = instant ? reply.length - shown : Math.max(2, Math.ceil((reply.length - shown) / 12));
            shown = Math.min(reply.length, shown + step);
            setMessages([...history, { role: "assistant", content: reply.slice(0, shown) }]);
          } else if (streamDone) {
            clearInterval(timer);
            resolve();
          }
        }, 24);
        (async () => {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            raw += decoder.decode(value, { stream: true });
          }
          streamDone = true;
        })().catch((err) => {
          clearInterval(timer);
          reject(err);
        });
      });
      const reply = visible().trim();
      if (!reply) throw new Error("No reply received.");
      setMessages([...history, { role: "assistant", content: reply }]);
      if (raw.includes(LEAD_SIGNAL) && !leadSent) setFormOpen(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages(history);
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const hasUserMessage = messages.length > 0;
  const showSuggestions = !hasUserMessage && !sending;

  return (
    <div className="ai-chat">
      {open && (
        <div className="ai-chat-panel" role="dialog" aria-label={`${BOT_NAME}, AI assistant`}>
          <div className="ai-chat-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="" className="ai-chat-avatar" width={38} height={38} />
            <div className="ai-chat-title">
              <div>
                {BOT_NAME} <span>· AI assistant</span>
              </div>
              <div className="ai-chat-status">
                <i aria-hidden="true" />
                Online · answers from this site
              </div>
            </div>
            {hasUserMessage && (
              <button type="button" className="ai-chat-icon-btn" onClick={resetChat} aria-label="Start a new chat" title="New chat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            )}
            <button type="button" className="ai-chat-icon-btn" onClick={() => setOpen(false)} aria-label="Close chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={listRef} aria-live="polite" className="ai-chat-body">
            <div className="ai-chat-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR} alt="" className="ai-chat-row-avatar" width={26} height={26} />
              <div className="ai-chat-msg assistant" dir="auto">
                {GREETING}
              </div>
            </div>

            {showSuggestions && (
              <>
                <div className="ai-chat-label">Popular questions</div>
                <div className="ai-chat-chips">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="ai-chat-chip" dir="auto" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-row ${m.role}`}>
                {m.role === "assistant" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={AVATAR} alt="" className="ai-chat-row-avatar" width={26} height={26} />
                )}
                <div className={`ai-chat-msg ${m.role}`} dir="auto">
                  {m.content ? (
                    m.role === "assistant" ? <Linkified text={m.content} /> : m.content
                  ) : (
                    <span aria-label="Assistant is typing" className="ai-chat-typing">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </div>
              </div>
            ))}

            {(formOpen || leadSent) && !sending && (
              <div className="ai-chat-lead">
                <LeadForm
                  source="chatbot"
                  session={session || null}
                  compact
                  onSent={() => setLeadSent(true)}
                />
              </div>
            )}

            {error && (
              <div role="alert" className="ai-chat-error">
                {error}{" "}
                <a href={whatsappHandoff(messages)} target="_blank" rel="noopener noreferrer">
                  Chat on WhatsApp
                </a>
              </div>
            )}
          </div>

          {hasUserMessage && !sending && !formOpen && !leadSent && (
            <div className="ai-chat-actions">
              <button type="button" className="ai-chat-action is-primary" onClick={() => setFormOpen(true)}>
                Share project details
              </button>
              <a className="ai-chat-action is-whatsapp" href={whatsappHandoff(messages)} target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.6-.1 1.2z" />
                </svg>
                WhatsApp
              </a>
            </div>
          )}

          <form onSubmit={onSubmit} className="ai-chat-compose">
            <label htmlFor="ai-chat-input" className="sr-only">
              Type your message
            </label>
            <textarea
              id="ai-chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={1500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about services, prices, work…"
              dir="auto"
            />
            <button type="submit" className="ai-chat-send" disabled={sending || !input.trim()} aria-label="Send message">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
          <p className="ai-chat-foot">AI can make mistakes. For an exact quote, Hamza replies personally.</p>
        </div>
      )}

      {nudge && !open && (
        <div className="ai-chat-nudge" role="status">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATAR} alt="" width={36} height={36} />
          <button type="button" className="ai-chat-nudge-open" onClick={() => setOpen(true)}>
            {NUDGE_MESSAGES[nudgeIndex % NUDGE_MESSAGES.length]}
          </button>
          <button type="button" className="ai-chat-nudge-close" onClick={dismissNudge} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <button
        type="button"
        className={`ai-chat-launcher${open ? " is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? `Close chat with ${BOT_NAME}` : `Ask ${BOT_NAME}`}
        aria-expanded={open}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="" width={56} height={56} />
            <span className="ai-chat-online" aria-hidden="true" />
            {!openedThisVisit && (
              <span className="ai-chat-badge" aria-hidden="true">
                1
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
