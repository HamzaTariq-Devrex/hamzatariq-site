import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import ReviewCard from "@/components/site/ReviewCard";
import { REVIEWS_SOURCE, TESTIMONIALS, hasReviews } from "@/lib/testimonials";
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
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <Section
        label="Reviews"
        title={
          <>
            What clients <span>say</span>
          </>
        }
        text={
          <>
            {TESTIMONIALS.length} brands posted these reviews on Instagram after their website went live. They were given to{" "}
            <a href={REVIEWS_SOURCE} target="_blank" rel="noopener">
              {SITE.agency.name}
            </a>
            , the agency I founded, for projects I led. Copied word for word, each linked to the brand. See the{" "}
            <Link href="/work">projects</Link> or the <Link href="/services/nextjs-websites">Next.js website service</Link>.
          </>
        }
      >
        <div className="review-grid">
          {TESTIMONIALS.map((t) => (
            <ReviewCard key={t.id} review={t} showImage />
          ))}
        </div>
      </Section>
    </SiteShell>
  );
}
