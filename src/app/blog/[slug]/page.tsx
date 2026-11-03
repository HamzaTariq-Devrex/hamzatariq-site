import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import AuthorBox from "@/components/site/AuthorBox";
import Faq from "@/components/site/ds/Faq";
import Section from "@/components/site/ds/Section";
import PostCard from "@/components/blog/PostCard";
import PostCta from "@/components/blog/PostCta";
import { renderMdx } from "@/components/blog/mdx";
import { formatPostDate, getPost, getPosts, getRelatedPosts, isScheduled, tagSlug } from "@/lib/blog";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Blog.css";

type Params = { params: Promise<{ slug: string }> };

// Scheduled posts go live on their date without a deploy: pages are rebuilt at most once a day.
export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle,
    description: post.description,
    keywords: [post.keyword, ...post.tags],
    alternates: { canonical: `/blog/${post.slug}`, types: { "application/rss+xml": "/blog/rss.xml" } },
    openGraph: {
      type: "article",
      title: post.seoTitle,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      authors: [SITE.url],
      tags: post.tags,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `${SITE.url}/blog/${post.slug}`;
  const related = getRelatedPosts(post);
  const content = await renderMdx(post.body, { auditCta: true });

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
          { "@type": "ListItem", position: 3, name: post.category.name, item: `${SITE.url}/blog/category/${post.category.slug}` },
          { "@type": "ListItem", position: 4, name: post.title, item: url },
        ],
      },
      {
        "@type": "BlogPosting",
        "@id": `${url}#post`,
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        datePublished: post.published,
        dateModified: post.updated ?? post.published,
        author: { "@id": `${SITE.url}/#person` },
        publisher: { "@id": `${SITE.url}/#person` },
        image: `${url}/opengraph-image`,
        articleSection: post.category.name,
        keywords: [post.keyword, ...post.tags].join(", "),
        wordCount: post.words,
        inLanguage: "en",
      },
      ...(post.faq.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: post.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ]
        : []),
    ],
  };

  return (
    <SiteShell hideCta>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav className="project-crumbs" aria-label="Breadcrumb">
        <Link href="/blog">Blog</Link>
        <span>/</span>
        <Link href={`/blog/category/${post.category.slug}`}>{post.category.name}</Link>
      </nav>

      <header className="post-head">
        {isScheduled(post) && <p className="post-scheduled">Scheduled: goes live on {formatPostDate(post.published)}</p>}
        <Link href={`/blog/category/${post.category.slug}`} className="x-label">
          {post.category.name}
        </Link>
        <h1 className="post-title">{post.title}</h1>
        <p className="post-lead">{post.description}</p>
        <div className="post-byline">
          <div className="post-author">
            <Image src={SITE.photo.src} alt="" width={44} height={44} className="post-byline-photo" />
            <div>
              <strong>{SITE.name}</strong>
              <span>Founder of {SITE.agency.name}</span>
            </div>
          </div>
          <dl className="post-dates">
            <div>
              <dt>Published</dt>
              <dd>
                <time dateTime={post.published}>{formatPostDate(post.published)}</time>
              </dd>
            </div>
            {post.updated && (
              <div>
                <dt>Updated</dt>
                <dd>
                  <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
                </dd>
              </div>
            )}
            <div>
              <dt>Reading time</dt>
              <dd>{post.readingMinutes} min</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="post-layout">
        {post.toc.length > 2 && (
          <aside className="post-toc" aria-label="On this page">
            <p>On this page</p>
            <ol>
              {post.toc
                .filter((t) => t.level === 2)
                .map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`}>{t.text}</a>
                  </li>
                ))}
              {post.faq.length > 0 && (
                <li>
                  <a href="#faq">FAQ</a>
                </li>
              )}
            </ol>
          </aside>
        )}

        <article className="post-body">
          {content}

          {post.faq.length > 0 && (
            <section id="faq" className="post-faq">
              <h2>Frequently asked questions</h2>
              <Faq items={post.faq} />
            </section>
          )}

          {post.tags.length > 0 && (
            <ul className="post-tags" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t}>
                  <Link href={`/blog/tag/${tagSlug(t)}`}>#{t}</Link>
                </li>
              ))}
            </ul>
          )}

          <PostCta category={post.category} />
          <AuthorBox heading="Written by" />
        </article>
      </div>

      {related.length > 0 && (
        <Section label="Keep reading" title="Related posts">
          <div className="post-grid">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </Section>
      )}
    </SiteShell>
  );
}
