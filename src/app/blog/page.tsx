import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import PostCard from "@/components/blog/PostCard";
import { EmptyBlog } from "@/components/blog/EmptyBlog";
import OpenChat from "@/components/site/ds/OpenChat";
import { BLOG_CATEGORIES, getPosts, getPostsInCategory } from "@/lib/blog";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Blog.css";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog: Next.js, React SEO and AI Chatbots",
  description:
    "Practical guides from Hamza Tariq on Next.js websites, dashboards, AI chatbots and React SEO, with real numbers from his own projects. No fluff, no filler.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default function BlogPage() {
  const posts = getPosts();
  const [featured, ...rest] = posts;
  const topics = BLOG_CATEGORIES.map((c) => ({ ...c, count: getPostsInCategory(c.slug).length })).filter((c) => c.count > 0);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
        ],
      },
      {
        "@type": "Blog",
        "@id": `${SITE.url}/blog#blog`,
        url: `${SITE.url}/blog`,
        name: "Hamza Tariq's blog",
        author: { "@id": `${SITE.url}/#person` },
        blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE.url}/blog/${p.slug}`, datePublished: p.published })),
      },
    ],
  };

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="blog-top">
        <div className="blog-intro">
          <span className="x-label">Blog</span>
          <h1 className="x-h1">
            Notes from <span>building fast websites</span>
          </h1>
          <p className="x-hero-lead">
            Practical guides on Next.js websites, dashboards, AI chatbots and React SEO, with real numbers from my own projects.
          </p>
        </div>
        <nav className="blog-topics" aria-label="Topics">
          <p className="blog-topics-title">Browse by topic</p>
          <Link href="/blog" className="is-active" aria-current="page">
            All posts <span>{posts.length}</span>
          </Link>
          {topics.map((c) => (
            <Link key={c.slug} href={`/blog/category/${c.slug}`}>
              {c.name} <span>{c.count}</span>
            </Link>
          ))}
        </nav>
      </section>

      {featured ? (
        <>
          <p className="blog-kicker">Latest guide</p>
          <PostCard post={featured} featured />
          {rest.length > 0 && (
            <>
              <h2 className="blog-kicker">More guides</h2>
              <div className="post-grid" data-stagger>
                {rest.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <EmptyBlog />
      )}

      <section className="blog-follow" data-reveal>
        <div>
          <h2>Get the next guide</h2>
          <p>Every new post goes into the RSS feed. Have a question about your own site? My AI assistant answers from these guides and my services.</p>
        </div>
        <div className="blog-follow-actions">
          <a href="/blog/rss.xml" className="page-btn page-btn-ghost">
            RSS feed
          </a>
          <OpenChat className="page-btn page-btn-primary">Ask my AI assistant</OpenChat>
        </div>
      </section>
    </SiteShell>
  );
}
