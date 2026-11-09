import Link from "next/link";
import Section from "@/components/site/ds/Section";
import Icon from "@/components/site/ds/Icon";
import TextReveal from "@/components/ui/TextReveal";
import InfiniteMovingCards from "@/components/ui/InfiniteMovingCards";
import "./styles/Reviews.css";
import { HOME_FEATURED_ID, REVIEW_LABEL, TESTIMONIALS, brandLinkLabel, getTestimonial, shortQuote, type Testimonial } from "@/lib/testimonials";

/**
 * Home "Trusted by" section: the featured quote lights up word by word as you scroll (Magic UI Text
 * Reveal), then two rows of short quotes moving in opposite directions (Aceternity Infinite Moving
 * Cards: faded edges, pause on hover, a static grid with reduced motion). Every quote is word for
 * word; cut ones end in "…" and link to the full review on /reviews.
 */
const ReviewItem = ({ t }: { t: Testimonial }) => {
  const { text, trimmed } = shortQuote(t.quote);
  return (
    <li className="trust-card">
      <figure>
        <figcaption className="trust-card-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.logo.src} alt="" width={32} height={32} loading="lazy" />
          <span>
            <a href={t.url} target="_blank" rel="noopener noreferrer">
              {t.brand}
            </a>
            <small>{t.category}</small>
          </span>
        </figcaption>
        <blockquote>&ldquo;{text}&rdquo;</blockquote>
        <div className="trust-card-foot">
          <p className="trust-card-label">{REVIEW_LABEL}</p>
          {trimmed && (
            <Link href={`/reviews#${t.id}`} className="trust-card-more">
              Read full review
            </Link>
          )}
        </div>
      </figure>
    </li>
  );
};

const HomeReviews = () => {
  const featured = getTestimonial(HOME_FEATURED_ID);
  if (!featured) return null;
  const rest = TESTIMONIALS.filter((t) => t.id !== featured.id);
  const rows = [rest.filter((_, i) => i % 2 === 0), rest.filter((_, i) => i % 2 === 1)];

  return (
    <Section
      id="reviews"
      className="home-trust"
      center
      label="Reviews"
      title={
        <>
          Trusted by {TESTIMONIALS.length}+ <span>brands</span>
        </>
      }
      text="Reviews brands posted on Instagram after we built their websites. Word for word, each linked to the brand."
    >
      <TextReveal text={`“${featured.quote}”`} className="trust-featured">
        <div className="trust-featured-foot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured.logo.src} alt={`${featured.brand} logo`} width={52} height={52} loading="lazy" />
          <span className="trust-featured-who">
            <strong>{featured.brand}</strong>
            <small>{REVIEW_LABEL}</small>
          </span>
          <a href={featured.url} target="_blank" rel="noopener noreferrer" className="trust-verified">
            {brandLinkLabel(featured)}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      </TextReveal>

      <div className="trust-wall" aria-label="More client reviews" data-motion="self">
        <InfiniteMovingCards speed="slow" aria-label="Client reviews, row 1">
          {rows[0].map((t) => (
            <ReviewItem key={t.id} t={t} />
          ))}
        </InfiniteMovingCards>
        <InfiniteMovingCards speed="slow" direction="right" aria-label="Client reviews, row 2">
          {rows[1].map((t) => (
            <ReviewItem key={t.id} t={t} />
          ))}
        </InfiniteMovingCards>
      </div>

      <p className="section-more">
        <Link href="/reviews" className="page-btn page-btn-ghost">
          See all {TESTIMONIALS.length} reviews <Icon name="arrow" size={16} />
        </Link>
      </p>
    </Section>
  );
};

export default HomeReviews;
