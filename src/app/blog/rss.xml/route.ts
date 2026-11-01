import { getPosts } from "@/lib/blog";
import { SITE } from "@/lib/site";

export const revalidate = 86400;

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** RSS 2.0 feed of published posts. */
export function GET() {
  const items = getPosts()
    .map(
      (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${SITE.url}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE.url}/blog/${p.slug}</guid>
      <description>${escape(p.description)}</description>
      <category>${escape(p.category.name)}</category>
      <pubDate>${new Date(`${p.published}T08:00:00Z`).toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${SITE.name}'s blog`)}</title>
    <link>${SITE.url}/blog</link>
    <atom:link href="${SITE.url}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Next.js websites, dashboards, AI chatbots and React SEO, with real numbers from real projects.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
