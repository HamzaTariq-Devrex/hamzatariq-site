// Classifies a reply to an outreach email: interested / question / not now / no / out of office /
// bounce. Gemini first; a keyword check is the fallback (and always wins for a clear "no").
import { ThinkingLevel } from "@google/genai";
import { CHAT_MODEL, gemini } from "@/lib/assistant/gemini";

export const REPLY_CLASSES = ["interested", "question", "not_now", "no", "out_of_office", "bounce"] as const;
export type ReplyClass = (typeof REPLY_CLASSES)[number];

const NO = /^\s*(no|nope|no thanks?|not interested|unsubscribe|remove( me)?|stop|please (don'?t|do not) (email|contact))\b|\b(not interested|unsubscribe|remove me|take me off|stop emailing|do not contact|don'?t contact)\b/i;
const OOO = /\b(out of (the )?office|on (annual )?leave|on holiday|on vacation|away (until|from)|limited access to (my )?email|automatic reply)\b/i;
const LATER = /\b(not (right )?now|maybe later|not at the moment|next (month|year|quarter)|in a few (weeks|months)|busy (right now|at the moment)|get back to you later|revisit)\b/i;

/** Keyword fallback. */
export const classifyByWords = (text: string, subject = ""): ReplyClass => {
  const t = `${subject}\n${text}`;
  if (NO.test(text.trim().split(/\n/)[0] ?? "") || NO.test(t)) return "no";
  if (OOO.test(t)) return "out_of_office";
  if (LATER.test(t)) return "not_now";
  if (/\?/.test(text)) return "question";
  return "interested";
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
          'Classify this reply to a cold email from a web developer offering website fixes. Answer as JSON {"class": "..."} with exactly one of: interested (wants the fixes, a call or more info), question (asks something before deciding), not_now (maybe later / bad timing), no (not interested, unsubscribe, stop, angry), out_of_office (automatic away message), bounce (delivery failure).',
        temperature: 0,
        maxOutputTokens: 50,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: AbortSignal.timeout(15000),
      },
    });
    const c = (JSON.parse(res.text ?? "{}") as { class?: string }).class;
    return (REPLY_CLASSES as readonly string[]).includes(c ?? "") ? (c as ReplyClass) : fallback;
  } catch {
    return fallback;
  }
};
