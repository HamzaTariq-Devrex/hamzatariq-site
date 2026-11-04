import type { Testimonial } from "@/lib/testimonials";

/** One real client review, linked to the client. Used on /reviews and in blog posts (<Review id>). */
const ReviewCard = ({ review }: { review: Testimonial }) => (
  <figure className="review-card">
    <blockquote>
      <p>&ldquo;{review.quote}&rdquo;</p>
    </blockquote>
    <figcaption>
      <a href={review.url} target="_blank" rel="noopener">
        <strong>{review.name}</strong>
      </a>
      <span>
        {review.role}, {review.company} · via {review.source}
      </span>
    </figcaption>
  </figure>
);

export default ReviewCard;
