// "Ask Hamza's AI": server logic for /api/chat. Adapted from the /bot skill's chatbot-core:
// answers come only from site content retrieved from Supabase (pgvector), chats are logged,
// and the reply ends with LEAD_SIGNAL when the visitor is ready to share project details.
import { ThinkingLevel } from "@google/genai";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/data/services";
import { hashIp, rpcClient, serverSecret } from "@/lib/supabase/server";
import { CHAT_MODELS, embedQuery, gemini } from "./gemini";

/** Sent after the reply text when the widget should show the lead form. Never part of the visible text. */
export const LEAD_SIGNAL = "\u001eLEAD";
const LEAD_MARKER = "[[LEAD]]";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1500;
const MAX_TOTAL_CHARS = 12000;
const RATE_LIMIT = 20; // visitor messages per IP per window
const RATE_WINDOW_MIN = 10;
const MATCH_COUNT = 6;
const MIN_SIMILARITY = 0.45;

const ALLOWED_ORIGINS = [SITE.url, SITE.url.replace("://", "://www.")];
const CONTACT_URL = `${SITE.url}/contact`;
const CALL_URL = SITE.bookingUrl ?? CONTACT_URL;

const SYSTEM_PROMPT = `You are "Hamza's AI", the assistant on ${SITE.url}, the website of ${SITE.name}, a freelance full-stack developer (React and Next.js) and founder of ${SITE.agency.name}. You help visitors understand his services, work and process, and help them get in touch.

BASICS
- Services: ${SERVICES.map((s) => `${s.name} (${SITE.url}/services/${s.slug})`).join("; ")}.
- Contact: ${CONTACT_URL}, email ${SITE.email}, WhatsApp ${SITE.social.whatsapp}.

ANSWERING
- Only state facts that are written in these basics or in the SITE CONTENT below. Don't guess or infer anything else (for example where Hamza lives, team size, timelines or what he doesn't offer). If it isn't written there, say you don't know and suggest a free call with Hamza: ${CALL_URL}
- Never invent prices, clients, results, timelines or guarantees. Prices on the site are starting prices, and every project is quoted after a free call.
- Details about a client (such as "Lahore-based") describe that client, not Hamza.
- Client projects were built at ${SITE.agency.name}; describe them that way.
- Stay on topic: Hamza, his services, work and process. Politely decline anything else.
- You are an AI assistant, not Hamza. Say so if asked. Talk about Hamza in the third person.

STYLE
- 2 to 3 short sentences, never more than 80 words. Plain text only: no markdown, no asterisks, no em dashes.
- At most one link per reply, written as a full URL that appears above or in SITE CONTENT.
- Don't greet or introduce yourself, unless the visitor only greets you; then just say "Hi".
- Always reply in simple English, even if the visitor writes in another language.
- End with one short question or one clear next step.

LEADS
- When the visitor wants to start a project, asks for a quote, a call or Hamza's availability, or asks how to hire him, answer briefly, say they can leave their details in the short form below, and end the reply with ${LEAD_MARKER}
- Never ask for an email address or phone number in the chat yourself.`;

export type ChatMessage = { role: "user" | "assistant"; content: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = /^\/[a-z0-9\-/]{0,100}$/i;

const memoryHits = new Map<string, { start: number; count: number }>();
// Fallback when the database count is unavailable (per warm instance only).
const memoryLimited = (key: string) => {
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || now - entry.start > RATE_WINDOW_MIN * 60_000) {
    memoryHits.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
};

const rateLimited = async (ipHash: string) => {
  const db = rpcClient();
  if (db) {
    const { data, error } = await db.rpc("app_chat_recent_count", {
      p_secret: serverSecret(),
      p_ip_hash: ipHash,
      p_minutes: RATE_WINDOW_MIN,
    });
    if (!error && typeof data === "number") return data >= RATE_LIMIT;
  }
  return memoryLimited(ipHash);
};

/** Clean, size-limited history that starts and ends with a visitor turn, or null if invalid. */
const sanitizeMessages = (input: unknown): ChatMessage[] | null => {
  if (!Array.isArray(input)) return null;
  const messages = input
    .filter(
      (m): m is ChatMessage =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_MESSAGES);
  let total = messages.reduce((sum, m) => sum + m.content.length, 0);
  while (messages.length && total > MAX_TOTAL_CHARS) total -= messages.shift()!.content.length;
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return null;
  return messages;
};

/** Site content most related to the visitor's question, as prompt text. */
const siteContext = async (messages: ChatMessage[]) => {
  const asked = messages.filter((m) => m.role === "user").map((m) => m.content);
  const last = asked[asked.length - 1];
  // Short follow-ups ("how much?") need the previous question to find the right page.
  const query = last.length < 60 && asked.length > 1 ? `${asked[asked.length - 2]}\n${last}` : last;
  const db = rpcClient();
  const embedding = await embedQuery(query).catch(() => null);
  if (!db || !embedding) return "";
  const { data, error } = await db.rpc("app_match_chunks", {
    p_secret: serverSecret(),
    p_embedding: JSON.stringify(embedding),
    p_count: MATCH_COUNT,
  });
  if (error || !data) return "";
  return data
    .filter((c) => c.similarity >= MIN_SIMILARITY)
    .map((c) => `[${c.url.split("#")[0]}] ${c.title}\n${c.content}`)
    .join("\n\n");
};

/** Strips LEAD_MARKER from streamed text, holding back a partial marker split across chunks. */
const leadFilter = (write: (text: string) => void) => {
  let pending = "";
  let found = false;
  return {
    push(text: string) {
      pending += text;
      if (pending.includes(LEAD_MARKER)) {
        found = true;
        pending = pending.split(LEAD_MARKER).join("");
      }
      let keep = 0;
      for (let n = Math.min(LEAD_MARKER.length - 1, pending.length); n > 0; n--) {
        if (LEAD_MARKER.startsWith(pending.slice(-n))) {
          keep = n;
          break;
        }
      }
      const out = pending.slice(0, pending.length - keep);
      pending = pending.slice(pending.length - keep);
      if (out) write(out);
    },
    end() {
      if (pending) write(pending);
      pending = "";
      return found;
    },
  };
};

const FALLBACK_REPLY = `Sorry, I can't help with that here. You can ask Hamza directly at ${CONTACT_URL}`;

const describeError = (error: unknown): [number, string] => {
  const status = (error as { status?: number })?.status;
  if (status === 429 || status === 503)
    return [status, `The assistant is busy right now. Please try again in a moment, or use ${CONTACT_URL}`];
  return [502, `The assistant is unavailable right now. Please use ${CONTACT_URL}`];
};

const streamReply = async (messages: ChatMessage[], system: string, write: (text: string) => void) => {
  const ai = gemini()!;
  const request = {
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    config: {
      systemInstruction: system,
      maxOutputTokens: 1024,
      temperature: 0.4,
      // Short answers from given content need no reasoning; this keeps the first token fast.
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  };
  const models = [...new Set(CHAT_MODELS)];
  for (let i = 0; i < models.length; i++) {
    let wrote = false;
    try {
      const stream = await ai.models.generateContentStream({ ...request, model: models[i] });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          wrote = true;
          write(text);
        }
      }
      return wrote;
    } catch (error) {
      const busy = [429, 503].includes((error as { status?: number })?.status ?? 0);
      if (wrote || !busy || i === models.length - 1) throw error;
    }
  }
  return false;
};

type Request = { method: string; origin: string | null; ip: string; userAgent: string; body: unknown };
type Prepared =
  | { status: number; json?: { error: string } }
  | {
      /** Writes the reply, then LEAD_SIGNAL if needed. onError is only called before anything was written. */
      stream: (write: (text: string) => void, onError: (status: number, message: string) => void) => Promise<void>;
      /** Saves the exchange; call once the stream has finished. */
      log: () => Promise<void>;
    };

export const prepareChat = async ({ method, origin, ip, userAgent, body }: Request): Promise<Prepared> => {
  if (method === "GET") return { status: 204 }; // warm-up ping from the widget
  if (method !== "POST") return { status: 405, json: { error: "Method not allowed" } };
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return { status: 403, json: { error: "Forbidden" } };
  }
  if (!gemini()) return { status: 503, json: { error: "The assistant is not configured yet." } };

  const data = (body ?? {}) as { messages?: unknown; page?: unknown; session?: unknown };
  const messages = sanitizeMessages(data.messages);
  if (!messages) return { status: 400, json: { error: "Invalid conversation." } };
  const page = typeof data.page === "string" && PAGE.test(data.page) ? data.page : null;
  const session = typeof data.session === "string" && UUID.test(data.session) ? data.session : null;
  const ipHash = hashIp(ip || "unknown");

  const [limited, context] = await Promise.all([rateLimited(ipHash), siteContext(messages)]);
  if (limited) return { status: 429, json: { error: "Too many messages. Please try again in a few minutes." } };

  const system = [
    SYSTEM_PROMPT,
    `SITE CONTENT\n${context || "(nothing relevant found for this question)"}`,
    page ? `The visitor is on ${SITE.url}${page === "/" ? "" : page}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let reply = "";
  let lead = false;

  return {
    stream: async (write, onError) => {
      let started = false;
      const out = (text: string) => {
        started = true;
        reply += text;
        write(text);
      };
      const filter = leadFilter(out);
      try {
        const wrote = await streamReply(messages, system, (text) => filter.push(text));
        lead = filter.end();
        if (!wrote || !reply.trim()) out((started ? "\n\n" : "") + FALLBACK_REPLY);
        if (lead) write(LEAD_SIGNAL);
      } catch (error) {
        filter.end();
        const [status, message] = describeError(error);
        if (!started) onError(status, message);
        else write(`\n\n${message}`);
      }
    },
    log: async () => {
      const db = rpcClient();
      if (!db || !session || !reply.trim()) return;
      const { error } = await db.rpc("app_log_chat", {
        p_secret: serverSecret(),
        p_session: session,
        p_page: page ?? "",
        p_ip_hash: ipHash,
        p_user_agent: userAgent.slice(0, 300),
        p_user_message: messages[messages.length - 1].content,
        p_assistant_message: reply.trim() + (lead ? "\n[lead form shown]" : ""),
      });
      if (error) console.error("chat log failed:", error.message);
    },
  };
};
