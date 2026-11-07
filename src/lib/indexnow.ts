import { SITE } from "./site";

// The key file public/<key>.txt must stay in place (also used by scripts/indexnow.mjs).
export const INDEXNOW_KEY = "718bcb0be670c128fd877ee016f03bef";

/** Tells IndexNow (Bing, Yandex, Seznam, Naver) about changed URLs. Returns the HTTP status. */
export async function submitToIndexNow(urls: string[]): Promise<number> {
  if (!urls.length) return 0;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE.url).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE.url}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return res.status;
}
