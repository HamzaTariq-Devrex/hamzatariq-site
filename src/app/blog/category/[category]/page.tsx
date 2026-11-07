import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import PostCard from "@/components/blog/PostCard";
import Icon from "@/components/site/ds/Icon";
import { BLOG_CATEGORIES, getCategory, getPostsInCategory } from "@/lib/blog";
import { SITE } from "@/lib/site";
import { fitDescription, fitTitle, jsonLd } from "@/lib/seo";
import "@/components/styles/Blog.css";

type Params = { params: Promise<{ category: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

// Only categories with posts get a page (no thin pages).
export function generateStaticParams() {
  return BLOG_CATEGORIES.filter((c) => getPostsInCategory(c.slug).length > 0).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return {
    title: fitTitle([`${category.name} Blog Posts`, `${category.name} Blog`, category.name]),
    description: fitDescription([category.description, `Written by ${SITE.name}, founder of ${SITE.agency.name}.`, "Real examples and numbers from his own projects."]),
    alternates: { canonical: `/blog/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  const posts = category ? getPostsInCategory(category.slug) : [];
  if (!category || posts.length === 0) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${SITE.url}/blog/category/${category.slug}` },
    ],
  };

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/blog">Blog</Link>
        <span>/</span>
        <span aria-current="page">{category.name}</span>
      </nav>
      <section className="x-hero blog-hero is-left">
        <div>
          <span className="x-label">Category</span>
          <h1 className="x-h1">{category.name}</h1>
          <p className="x-hero-lead">{category.description}</p>
          <Link href={category.cta.href} className="x-link blog-cat-link">
            {category.cta.label} <Icon name="arrow" size={16} />
          </Link>
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
