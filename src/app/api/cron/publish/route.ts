import { revalidatePath } from "next/cache";
import { getPosts, todayPkt } from "@/lib/blog";
import { submitToIndexNow } from "@/lib/indexnow";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Publishes scheduled posts on their date (Vercel Cron, daily 19:05 UTC = 00:05 PKT, see vercel.json).
 * Posts go live by date without a deploy, so this refreshes the cached blog pages, sitemap and RSS
 * and pings IndexNow for every post published today. `?date=YYYY-MM-DD` re-runs it for another day.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; manual runs use the same header.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json({ error: "CRON_SECRET is not set" }, 500);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);

  const param = new URL(req.url).searchParams.get("date");
  if (param && !DATE.test(param)) return json({ error: "date must be YYYY-MM-DD" }, 400);
  const date = param ?? todayPkt();

  const posts = getPosts().filter((p) => p.published === date);
  if (!posts.length) return json({ date, posts: [], revalidated: [], indexNow: null });

  const categories = [...new Set(posts.map((p) => `/blog/category/${p.category.slug}`))];
  const paths = ["/blog", ...categories, ...posts.map((p) => `/blog/${p.slug}`), "/sitemap.xml", "/blog/rss.xml"];
  paths.forEach((path) => revalidatePath(path));
  // Older posts, pillar lists, tags and OG images under /blog may link to the new post (links to
  // posts not live yet render as plain text), so refresh the whole /blog tree as well.
  revalidatePath("/blog", "layout");

  const urls = [...posts.map((p) => `/blog/${p.slug}`), "/blog", ...categories].map((path) => `${SITE.url}${path}`);
  let indexNow: number | string;
  try {
    indexNow = await submitToIndexNow(urls);
  } catch (err) {
    indexNow = err instanceof Error ? err.message : "failed";
  }

  return json({ date, posts: posts.map((p) => p.slug), revalidated: paths, indexNow, submitted: urls });
}
