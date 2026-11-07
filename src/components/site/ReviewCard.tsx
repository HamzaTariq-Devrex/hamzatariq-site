import Image from "next/image";
import { REVIEW_LABEL, type Testimonial } from "@/lib/testimonials";
import "@/components/styles/Reviews.css";

type Props = { review: Testimonial; showImage?: boolean };

/**
 * One real client review, word for word, linked to the brand's Instagram (or website when the
 * brand has no handle). No star ratings. Used on the home page, /reviews, /work/<slug>, service,
 * industry, /hire and /about pages, and in posts (<Review id>).
 */
const ReviewCard = ({ review, showImage = false }: Props) => (
  <figure className="review-card">
    <figcaption className="review-head">
      <Image src={review.logo.src} alt={`${review.brand} logo`} width={44} height={44} className="review-logo" />
      <span className="review-who">
        <strong>{review.brand}</strong>
        <a href={review.url} target="_blank" rel="noopener noreferrer">
          {review.instagram ? `@${review.instagram}` : review.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      </span>
      <span className="review-cat">{review.category}</span>
    </figcaption>
    <blockquote>
      <p>&ldquo;{review.quote}&rdquo;</p>
    </blockquote>
    <p className="review-label">{REVIEW_LABEL}</p>
    {showImage && review.image && (
      <a href={review.image.src} target="_blank" rel="noopener" className="review-image" aria-label={`Open ${review.brand}'s original review image`}>
        <Image
          src={review.image.src}
          alt={`${review.brand}'s review of Devrex Digital, as posted on Instagram`}
          width={review.image.width}
          height={review.image.height}
          sizes="(max-width: 760px) 40vw, 140px"
          loading="lazy"
        />
        <span>See the original post</span>
      </a>
    )}
  </figure>
);

export default ReviewCard;
