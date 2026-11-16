// Classifies a reply to an outreach email (owner, 2026-11-16, autopilot):
// - interested: a plain yes / send it / interested, nothing else to answer → automatic reply with the fixes
// - price: only asks what it costs → automatic reply with the real starting prices
// - question: anything else that needs Hamza (call time, negotiation, unclear) → no reply, HOT alert
// - not_now, no, out_of_office, bounce: as before.
// Gemini first; a keyword check is the fallback (and always wins for a clear "no"). When unsure,
// the answer is "question": Hamza answers it himself.
import { ThinkingLevel } from "@google/genai";
import { CHAT_MODEL, gemini } from "@/lib/assistant/gemini";

export const REPLY_CLASSES = ["interested", "price", "question", "not_now", "no", "out_of_office", "bounce"] as const;
export type ReplyClass = (typeof REPLY_CLASSES)[number];

const NO = /^\s*(no|nope|no thanks?|not interested|unsubscribe|remove( me)?|stop|please (don'?t|do not) (email|contact))\b|\b(not interested|unsubscribe|remove me|take me off|stop emailing|do not contact|don'?t contact)\b/i;
const OOO = /\b(out of (the )?office|on (annual )?leave|on holiday|on vacation|away (until|from)|limited access to (my )?email|automatic reply)\b/i;
const LATER = /\b(not (right )?now|maybe later|not at the moment|next (month|year|quarter)|in a few (weeks|months)|busy (right now|at the moment)|get back to you later|revisit)\b/i;
const YES = /^\s*(yes|yeah|yep|sure|ok(ay)?|please( do)?|go ahead|send (it|them|it over|me)|interested|sounds good|why not)\b/i;
const PRICE = /\b(how much|price|pricing|cost|costs|charge|rates?|quote|budget|fee|fees)\b/i;
const OTHER = /\b(call|phone|meet|meeting|zoom|time|when|discount|cheaper|negotiat|deal|contract|who are you|how did you)\b/i;

/** Keyword fallback. Unclear → "question" (Hamza answers). */
export const classifyByWords = (text: string, subject = ""): ReplyClass => {
  const t = `${subject}\n${text}`;
  if (NO.test(text.trim().split(/\n/)[0] ?? "") || NO.test(t)) return "no";
  if (OOO.test(t)) return "out_of_office";
  if (LATER.test(t)) return "not_now";
  if (PRICE.test(text) && !OTHER.test(text)) return "price";
  const short = text.trim().split(/\s+/).length <= 25;
  if (YES.test(text) && short && !/\?/.test(text) && !OTHER.test(text)) return "interested";
  return "question";
};

export const classifyReply = async (text: string, subject: string): Promise<ReplyClass> => {
  const fallback = classifyByWords(text, subject);
  if (fallback === "no") return "no"; // a clear "no" is never second-guessed
  const ai = gemini();
  if (!ai || !text.trim()) return fallback;
  try {
    const res = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: `Subject: ${subject}\n\n${text.slice(0, 2000)}` }] }],
      config: {
        systemInstruction:
          'Classify this reply to a cold email from a web developer who offered to send website fixes or a free homepage idea. Answer as JSON {"class": "..."} with exactly one of: interested (ONLY a plain yes / send it / interested, with no other question, condition or request), price (ONLY asks what it costs or for prices, nothing else to answer), question (anything else a person must answer: a call or meeting time, negotiation, discounts, who are you, several questions, or unclear), not_now (maybe later / bad timing), no (not interested, unsubscribe, stop, angry), out_of_office (automatic away message), bounce (delivery failure). When unsure, answer question.',
        temperature: 0,
        maxOutputTokens: 50,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: AbortSignal.timeout(15000),
      },
    });
    const c = (JSON.parse(res.text ?? "{}") as { class?: string }).class;
    if (!(REPLY_CLASSES as readonly string[]).includes(c ?? "")) return fallback;
    // An automatic answer needs both Gemini and the keywords to agree; otherwise Hamza answers.
    if ((c === "interested" || c === "price") && fallback !== c) return "question";
    return c as ReplyClass;
  } catch {
    return fallback;
  }
};
