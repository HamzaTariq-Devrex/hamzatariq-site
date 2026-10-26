// Embeds the built site and content/owner/ into Supabase site_chunks for the AI assistant.
// Runs after `next build`: reads the prerendered HTML in .next/server/app, so every page
// (including future blog posts) is covered. Only pages whose text changed are re-embedded.
//
//   npm run embed          local, reads .env.local
//   postbuild (Vercel)     production deploys only; failures warn but never fail the build
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://hamzatariq.site";
const APP_DIR = ".next/server/app";
const OWNER_DIR = "content/owner";
// Keep in sync with src/lib/assistant/gemini.ts and the vector(768) column.
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768;
const CHUNK_CHARS = 1200;
const SKIP = [/^_/, /^admin\//, /^(404|500)$/, /opengraph-image/];

const soft = process.argv.includes("--soft");

const log = (...args) => console.log("[embed]", ...args);

const decode = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Visible text of the page's <main> (or <body>), one block per line. */
const htmlToText = (html) => {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "";
  const lines = decode(
    main
      .replace(/<(script|style|svg|noscript|template|iframe|header|nav|footer)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, "")
      // Owner TODO markers show on non-production builds only; never embed them.
      .replace(/<strong>TODO\(owner\)<\/strong>[^<]*/g, "")
      .replace(/<(br|\/p|\/h[1-6]|\/li|\/dt|\/dd|\/tr|\/div|\/section|\/summary|\/blockquote)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines.filter((l, i) => l !== lines[i - 1]).join("\n");
};

const chunk = (text) => {
  const chunks = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current && current.length + line.length + 1 > CHUNK_CHARS) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) chunks.push(current);
  return chunks;
};

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

const collectPages = () => {
  if (!existsSync(APP_DIR)) throw new Error(`${APP_DIR} not found; run \`next build\` first`);
  return walk(APP_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((file) => {
      const route = relative(APP_DIR, file).split(sep).join("/").replace(/\.html$/, "");
      if (SKIP.some((re) => re.test(route))) return null;
      const html = readFileSync(file, "utf8");
      const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? route).trim();
      const url = route === "index" ? SITE_URL : `${SITE_URL}/${route}`;
      return { url, title, text: htmlToText(html) };
    })
    .filter((p) => p && p.text.length > 80);
};

// Owner facts are mirrored on public pages; anchors keep their URLs unique in site_chunks.
const collectOwnerFiles = () => {
  const files = [
    { file: join(OWNER_DIR, "profile.md"), url: `${SITE_URL}/about#owner-profile`, title: "Hamza Tariq: profile, services and pricing" },
    ...(existsSync(join(OWNER_DIR, "projects")) ? readdirSync(join(OWNER_DIR, "projects")) : [])
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({
        file: join(OWNER_DIR, "projects", f),
        url: `${SITE_URL}/work/${f.replace(/\.md$/, "")}#owner-notes`,
        title: `Project notes: ${f.replace(/\.md$/, "")}`,
      })),
  ];
  return files
    .filter((f) => existsSync(f.file))
    .map((f) => ({
      url: f.url,
      title: f.title,
      text: readFileSync(f.file, "utf8")
        .split("\n")
        .filter((l) => !/TODO\(owner\)|^Single source of truth|`public\//.test(l))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    }));
};

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

const withRetry = async (fn, tries = 4) => {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i >= tries || ![429, 500, 503].includes(error?.status)) throw error;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
};

const main = async () => {
  if (soft && process.env.VERCEL_ENV !== "production") return log("skipped: runs on production deploys (use npm run embed locally)");
  const { GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVER_SECRET } = process.env;
  if (!GEMINI_API_KEY || !NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY || !SUPABASE_SERVER_SECRET) {
    throw new Error("missing GEMINI_API_KEY or Supabase env vars");
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.trim() });
  const db = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const secret = SUPABASE_SERVER_SECRET;

  const docs = [...collectPages(), ...collectOwnerFiles()];
  const { data: existing, error } = await db.rpc("app_chunk_hashes", { p_secret: secret });
  if (error) throw new Error(`app_chunk_hashes: ${error.message}`);
  const known = new Map(existing.map((r) => [r.url, r.hashes]));

  let updated = 0;
  let chunks = 0;
  for (const doc of docs) {
    const parts = chunk(doc.text).map((content) => ({ content, hash: hash(`${doc.title}\n${content}`) }));
    if (known.get(doc.url) === parts.map((p) => p.hash).join(",")) continue;
    const res = await withRetry(() =>
      ai.models.embedContent({
        model: EMBED_MODEL,
        contents: parts.map((p) => `title: ${doc.title} | text: ${p.content}`),
        config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBED_DIMENSIONS },
      }),
    );
    const payload = parts.map((p, i) => ({ ...p, embedding: res.embeddings[i].values }));
    const { error: replaceError } = await db.rpc("app_replace_chunks", {
      p_secret: secret,
      p_url: doc.url,
      p_title: doc.title,
      p_chunks: payload,
    });
    if (replaceError) throw new Error(`app_replace_chunks ${doc.url}: ${replaceError.message}`);
    updated += 1;
    chunks += parts.length;
  }

  const { data: pruned, error: pruneError } = await db.rpc("app_prune_chunks", {
    p_secret: secret,
    p_keep_urls: docs.map((d) => d.url),
  });
  if (pruneError) throw new Error(`app_prune_chunks: ${pruneError.message}`);
  log(`${docs.length} pages, ${updated} re-embedded (${chunks} chunks), ${pruned} chunks of removed pages deleted`);
};

main().catch((error) => {
  console.error("[embed] failed:", error.message);
  // On deploys a failed embed must not block the site; the assistant keeps the previous content.
  process.exitCode = soft ? 0 : 1;
});
