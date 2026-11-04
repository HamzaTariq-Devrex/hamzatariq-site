import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import ReviewCard from "@/components/site/ReviewCard";
import { TESTIMONIALS, hasReviews } from "@/lib/testimonials";
import { SITE } from "@/lib/site";
import { fitDescription, jsonLd } from "@/lib/seo";
import "@/components/styles/Blog.css";

export const metadata: Metadata = {
  title: "Client Reviews",
  description: fitDescription([
    `What clients say about working with ${SITE.name}, founder of ${SITE.agency.name}.`,
    "Real, unedited reviews of Next.js websites, dashboards and AI chatbots, each linked to the client who wrote it.",
  ]),
  alternates: { canonical: "/reviews" },
};

// Real reviews only (content/testimonials.json). With none yet, the page doesn't exist.
export default function ReviewsPage() {
  if (!hasReviews) notFound();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Reviews", item: `${SITE.url}/reviews` },
        ],
      },
      ...TESTIMONIALS.map((t) => ({
        "@type": "Review",
        author: { "@type": "Person", name: t.name },
        reviewBody: t.quote,
        datePublished: t.date,
        itemReviewed: { "@id": `${SITE.url}/#person` },
      })),
    ],
  };
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <Section label="Reviews" title="What clients say" text="Real reviews, unedited, each linked to the client who wrote it.">
        <div className="review-grid">
          {TESTIMONIALS.map((t) => (
            <ReviewCard key={t.id} review={t} />
          ))}
        </div>
      </Section>
    </SiteShell>
  );
}
