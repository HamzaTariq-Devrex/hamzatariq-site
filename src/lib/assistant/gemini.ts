import { GoogleGenAI } from "@google/genai";

// Keep EMBED_MODEL and EMBED_DIMENSIONS in sync with scripts/embed-content.mjs and the
// vector(768) column in supabase/migrations: query and document vectors must match.
export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIMENSIONS = 768;
// Measured 2026-10-26 on the free tier: gemini-3.5-flash with minimal thinking starts replying in 1-2 s,
// while the Flash-Lite models took 13-40 s. So there is no second model: when this one is busy or out of
// quota, the chat answers from the offline answer bank straight away (owner's decision).
export const CHAT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

let client: GoogleGenAI | null = null;

/** Server-only Gemini client, or null when GEMINI_API_KEY is missing. */
export const gemini = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
};

export const embedQuery = async (text: string) => {
  const ai = gemini();
  if (!ai) return null;
  const res = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBED_DIMENSIONS },
  });
  return res.embeddings?.[0]?.values ?? null;
};
