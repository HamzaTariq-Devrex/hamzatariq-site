import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import PostCard from "@/components/blog/PostCard";
import { EmptyBlog } from "@/components/blog/EmptyBlog";
import { BLOG_CATEGORIES, getPosts, getPostsInCategory } from "@/lib/blog";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Blog.css";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Blog: Next.js, React SEO and AI Chatbots",
  description:
    "Practical guides from Hamza Tariq on Next.js websites, dashboards, AI chatbots and React SEO, with real numbers from his own projects. No fluff, no filler.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default function BlogPage() {
  const posts = getPosts();
  const [featured, ...rest] = posts;
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
      <section className="x-hero x-hero-center blog-hero">
        <span className="x-label">Blog</span>
        <h1 className="x-h1">
          Notes from <span>building fast websites</span>
        </h1>
        <p className="x-hero-lead">
          Practical guides on Next.js websites, dashboards, AI chatbots and React SEO, with real numbers from my own projects.
        </p>
      </section>

      <nav className="blog-cats" aria-label="Categories">
        <Link href="/blog" className="is-active">
          All posts <span>{posts.length}</span>
        </Link>
        {BLOG_CATEGORIES.filter((c) => getPostsInCategory(c.slug).length > 0).map((c) => (
          <Link key={c.slug} href={`/blog/category/${c.slug}`}>
            {c.name} <span>{getPostsInCategory(c.slug).length}</span>
          </Link>
        ))}
      </nav>

      {featured ? (
        <>
          <PostCard post={featured} featured />
          {rest.length > 0 && (
            <div className="post-grid">
              {rest.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyBlog />
      )}
      <p className="blog-rss">
        <a href="/blog/rss.xml">Subscribe with RSS</a>
      </p>
    </SiteShell>
  );
}
