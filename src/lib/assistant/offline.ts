// Offline answers for when Gemini fails or its free quota runs out: matches the visitor's
// question to content/chatbot/answers.json by keywords, phrases and small typos. No API calls.
import bank from "../../../content/chatbot/answers.json";

type Entry = {
  id: string;
  answer: string;
  keywords: string[];
  phrases: string[];
  lead?: boolean;
  maxWords?: number;
};

export type OfflineReply = { id: string; text: string; lead: boolean };

export const OFF_TOPIC_REPLY = bank.offTopic;

const MIN_SCORE = 2;
// An answer this strong beats an off-topic phrase ("write me a website quote").
const BEATS_OFF_TOPIC = 4;

const normalize = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/next\.?\s?js/g, "nextjs")
    .replace(/three\.?\s?js/g, "threejs")
    .replace(/e-commerce/g, "ecommerce")
    .replace(/web\s?app/g, "webapp")
    .replace(/[^a-z0-9+$ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

const isTypo = (a: string, b: string) => {
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  // Levenshtein distance <= 1
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
};

const entries = (bank.answers as Entry[]).map((e) => ({
  ...e,
  keywords: [...new Set(e.keywords.map((k) => normalize(k).trim()))],
  phrases: e.phrases.map((p) => normalize(p)),
}));
const topicWords = new Set(bank.topicWords.map((w) => normalize(w).trim()));
const offTopicPhrases = bank.offTopicPhrases.map((p) => normalize(p).trimEnd());

const score = (entry: (typeof entries)[number], text: string, tokens: string[]) => {
  if (entry.maxWords && tokens.length > entry.maxWords) return 0;
  let points = 0;
  // Each word of the question counts once, so "website" doesn't score for both "website" and "websites".
  for (const t of new Set(tokens)) if (entry.keywords.some((k) => t === k || isTypo(t, k))) points += 2;
  for (const p of entry.phrases) if (text.includes(p)) points += 3;
  return points;
};

const match = (question: string) => {
  const text = normalize(question);
  const tokens = text.trim().split(" ").filter(Boolean);
  let best: { entry: (typeof entries)[number] | null; points: number } = { entry: null, points: 0 };
  for (const entry of entries) {
    const points = score(entry, text, tokens);
    if (points > best.points) best = { entry, points };
  }
  const offTopic = offTopicPhrases.some((p) => text.includes(p)) && best.points < BEATS_OFF_TOPIC;
  return { ...best, tokens, offTopic };
};

/** True when the question is clearly not about Hamza's services (coding help, trivia, jokes...). */
export const isOffTopic = (question: string) => match(question).offTopic;

/** Saved answer for the question, the off-topic line, or the "Hamza will answer personally" reply with the lead form. */
export const offlineReply = (question: string): OfflineReply => {
  const { entry, points, tokens, offTopic } = match(question);
  if (offTopic) return { id: "off-topic", text: OFF_TOPIC_REPLY, lead: false };
  if (entry && points >= MIN_SCORE) return { id: entry.id, text: entry.answer, lead: !!entry.lead };
  if (tokens.some((t) => topicWords.has(t))) return { id: "personal", text: bank.personal, lead: true };
  return { id: "off-topic", text: OFF_TOPIC_REPLY, lead: false };
};
