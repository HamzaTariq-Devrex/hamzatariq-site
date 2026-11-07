import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import BookCall from "@/components/site/BookCall";
import OpenChat from "@/components/site/ds/OpenChat";
import ReviewsBrowser from "@/components/site/ReviewsBrowser";
import { REVIEWS_SOURCE, REVIEW_CATEGORIES, TESTIMONIALS, hasReviews } from "@/lib/testimonials";
import { SITE } from "@/lib/site";
import { fitDescription, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Client Reviews",
  description: fitDescription([
    `Real reviews from ${TESTIMONIALS.length} brands, word for word, of websites and online stores built at ${SITE.agency.name} in projects led by ${SITE.name}.`,
    "Each review is linked to the brand.",
    "Posted publicly on Instagram.",
  ]),
  alternates: { canonical: "/reviews" },
};

// Real reviews only (content/testimonials.json). With none, the page doesn't exist.
// No star ratings and no AggregateRating: the reviews are quotes, not scores.
export default function ReviewsPage() {
  if (!hasReviews) notFound();
  const url = `${SITE.url}/reviews`;
  const agency = { "@type": "Organization", name: SITE.agency.name, url: SITE.agency.url };
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Reviews", item: url },
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: "Client reviews",
        about: { "@id": `${SITE.url}/#person` },
        hasPart: TESTIMONIALS.map((t) => ({
          "@type": "Review",
          author: { "@type": "Organization", name: t.brand, url: t.url },
          reviewBody: t.quote,
          itemReviewed: agency,
        })),
      },
    ],
  };

  return (
    <SiteShell
      cta={{
        title: (
          <>
            Want a website your customers <span>talk about</span>?
          </>
        ),
        text: "Tell me what you need on a free call. You'll get a clear plan, price and timeline afterwards.",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="x-hero x-hero-center reviews-hero">
        <span className="x-label">Reviews</span>
        <h1 className="x-h1">
          What clients <span>say</span>
        </h1>
        <p className="x-hero-lead">
          Brands posted these reviews on Instagram after their website went live. They were given to{" "}
          <a href={REVIEWS_SOURCE} target="_blank" rel="noopener">
            {SITE.agency.name}
          </a>
          , the agency I founded, for projects I led. Copied word for word, each linked to the brand.
        </p>
        <dl className="review-stats">
          <div>
            <dt>Brands</dt>
            <dd>{TESTIMONIALS.length}</dd>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>{REVIEW_CATEGORIES.length}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>All public on Instagram</dd>
          </div>
        </dl>
      </section>

      <ReviewsBrowser reviews={TESTIMONIALS} categories={REVIEW_CATEGORIES} />

      <section className="reviews-end" data-reveal>
        <h2 className="x-h2">Next: your project</h2>
        <p className="x-lead">
          See the <Link href="/work">projects behind these reviews</Link> or the <Link href="/services/nextjs-websites">Next.js website service</Link>, then
          book a free call or ask my AI assistant.
        </p>
        <div className="x-actions">
          <BookCall />
          <OpenChat className="page-btn page-btn-ghost">Ask my AI assistant</OpenChat>
        </div>
      </section>
    </SiteShell>
  );
}
