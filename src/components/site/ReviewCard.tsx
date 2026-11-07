import Image from "next/image";
import { REVIEW_LABEL, brandLinkLabel, type Testimonial } from "@/lib/testimonials";
import "@/components/styles/Reviews.css";

/**
 * One real client review, word for word, linked to the brand's Instagram (or website when the
 * brand has no handle). No star ratings. Used in review strips (service, industry, /hire, /about)
 * and in posts (<Review id>). Fades in on scroll via data-reveal (SiteShell's Reveal).
 */
const ReviewCard = ({ review }: { review: Testimonial }) => (
  <figure className="review-card" data-reveal>
    <figcaption className="review-head">
      <Image src={review.logo.src} alt={`${review.brand} logo`} width={44} height={44} className="review-logo" />
      <span className="review-who">
        <strong>{review.brand}</strong>
        <a href={review.url} target="_blank" rel="noopener noreferrer">
          {brandLinkLabel(review)}
        </a>
      </span>
      <span className="review-cat">{review.category}</span>
    </figcaption>
    <blockquote>
      <p>&ldquo;{review.quote}&rdquo;</p>
    </blockquote>
    <p className="review-label">{REVIEW_LABEL}</p>
  </figure>
);

export default ReviewCard;
