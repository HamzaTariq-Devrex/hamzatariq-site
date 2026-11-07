"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import ReviewStory from "@/components/site/ReviewStory";
import { REVIEW_LABEL, brandLinkLabel, type Testimonial } from "@/lib/testimonials";
import "@/components/styles/Reviews.css";

type Props = { reviews: Testimonial[]; categories: { name: string; count: number }[] };

/**
 * /reviews: category filter chips and a masonry wall of every review (full text, word for word),
 * each with the real Instagram story in a phone frame. Cards stay mounted and are hidden when
 * filtered out, so /reviews#<id> links and the scroll reveal keep working.
 */
const ReviewsBrowser = ({ reviews, categories }: Props) => {
  const [active, setActive] = useState("All");

  // A link to one review (/reviews#id) always shows it, whatever filter was chosen before.
  useEffect(() => {
    const show = () => {
      if (window.location.hash) setActive("All");
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, []);

  return (
    <>
      <div className="review-chips" role="group" aria-label="Filter reviews by category">
        {[{ name: "All", count: reviews.length }, ...categories].map((c) => (
          <button key={c.name} type="button" className="review-chip" aria-pressed={active === c.name} onClick={() => setActive(c.name)}>
            {c.name} <span>{c.count}</span>
          </button>
        ))}
      </div>
      <p className="review-count" aria-live="polite">
        Showing {active === "All" ? reviews.length : reviews.filter((r) => r.category === active).length} of {reviews.length} reviews
      </p>

      <div className="review-masonry">
        {reviews.map((t) => (
          <figure key={t.id} id={t.id} className="review-card is-full" hidden={active !== "All" && t.category !== active} data-reveal>
            <figcaption className="review-head">
              <Image src={t.logo.src} alt={`${t.brand} logo`} width={44} height={44} className="review-logo" />
              <span className="review-who">
                <strong>{t.brand}</strong>
                <a href={t.url} target="_blank" rel="noopener noreferrer">
                  {brandLinkLabel(t)}
                </a>
              </span>
              <span className="review-cat">{t.category}</span>
            </figcaption>
            <blockquote>
              <p>&ldquo;{t.quote}&rdquo;</p>
            </blockquote>
            <div className="review-foot">
              <p className="review-label">{REVIEW_LABEL}</p>
              <ReviewStory review={t} />
            </div>
          </figure>
        ))}
      </div>
    </>
  );
};

export default ReviewsBrowser;
