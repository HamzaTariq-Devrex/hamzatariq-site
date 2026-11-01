import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import PostCard from "@/components/blog/PostCard";
import { getAllTags, getPostsWithTag, tagFromSlug, tagSlug } from "@/lib/blog";
import "@/components/styles/Blog.css";

type Params = { params: Promise<{ tag: string }> };

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return getAllTags().map((t) => ({ tag: tagSlug(t) }));
}

// Tag pages help readers browse but are thin for search: noindex, and not in the sitemap.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tag = tagFromSlug((await params).tag);
  if (!tag) return {};
  return {
    title: `Posts tagged ${tag}`,
    description: `Blog posts by Hamza Tariq tagged ${tag}.`,
    alternates: { canonical: `/blog/tag/${tagSlug(tag)}` },
    robots: { index: false, follow: true },
  };
}

export default async function TagPage({ params }: Params) {
  const tag = tagFromSlug((await params).tag);
  if (!tag) notFound();
  const posts = getPostsWithTag(tag);
  return (
    <SiteShell>
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/blog">Blog</Link>
        <span>/</span>
        <span aria-current="page">#{tag}</span>
      </nav>
      <section className="x-hero blog-hero is-left">
        <div>
          <span className="x-label">Tag</span>
          <h1 className="x-h1">#{tag}</h1>
        </div>
      </section>
      <div className="post-grid">
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} />
        ))}
      </div>
    </SiteShell>
  );
}
