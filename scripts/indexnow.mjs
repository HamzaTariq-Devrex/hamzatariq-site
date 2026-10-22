// Submits every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver).
// Usage: node scripts/indexnow.mjs [siteUrl]
const SITE_URL = (process.argv[2] || process.env.SITE_URL || "https://hamzatariq.site").replace(/\/$/, "");
const KEY = "718bcb0be670c128fd877ee016f03bef";

const res = await fetch(`${SITE_URL}/sitemap.xml`);
if (!res.ok) throw new Error(`Sitemap request failed: ${res.status}`);
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) throw new Error("Sitemap has no URLs");

const submit = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(SITE_URL).host,
    key: KEY,
    keyLocation: `${SITE_URL}/${KEY}.txt`,
    urlList: urls,
  }),
});

console.log(`IndexNow: submitted ${urls.length} URLs, status ${submit.status}`);
if (submit.status >= 400) {
  console.error(await submit.text());
  process.exit(1);
}
