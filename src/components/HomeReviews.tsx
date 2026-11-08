import { type CSSProperties } from "react";
import Link from "next/link";
import Section from "@/components/site/ds/Section";
import Icon from "@/components/site/ds/Icon";
import Marquee from "@/components/motion/Marquee";
import "./styles/Reviews.css";
import { HOME_FEATURED_ID, LOGO_REVIEWS, REVIEW_LABEL, TESTIMONIALS, brandLinkLabel, getTestimonial, shortQuote, type Testimonial } from "@/lib/testimonials";

/**
 * Home "Trusted by" section: one featured quote in large type, two marquee rows of short quotes
 * moving in opposite directions inside the container (fade masks at both edges, pause on hover or
 * focus, a static grid with reduced motion), then the greyscale logo row. Every quote is word for
 * word; cut ones end in "…" and link to the full review on /reviews.
 */
const MarqueeCard = ({ t }: { t: Testimonial }) => {
  const { text, trimmed } = shortQuote(t.quote);
  return (
    <figure className="trust-card">
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
  );
};

// Server-rendered rows; the Marquee island clones the cards in the browser for a seamless loop.
const Row = ({ items, reverse }: { items: Testimonial[]; reverse?: boolean }) => (
  <Marquee
    className={`trust-marquee${reverse ? " is-reverse" : ""}`}
    trackClassName="trust-track"
    copyClassName="trust-copy"
    speed={reverse ? -34 : 34}
    draggable
    cursorLabel="Drag"
  >
    {items.map((t) => (
      <MarqueeCard key={t.id} t={t} />
    ))}
  </Marquee>
);

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
      <figure className="trust-featured" data-reveal>
        <blockquote>&ldquo;{featured.quote}&rdquo;</blockquote>
        <figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured.logo.src} alt={`${featured.brand} logo`} width={52} height={52} loading="lazy" />
          <span className="trust-featured-who">
            <strong>{featured.brand}</strong>
            <small>{featured.category}</small>
          </span>
          <a href={featured.url} target="_blank" rel="noopener noreferrer" className="trust-verified">
            {brandLinkLabel(featured)}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </figcaption>
        <p className="trust-label">{REVIEW_LABEL}</p>
      </figure>

      <div className="trust-wall" aria-label="More client reviews" data-reveal>
        <Row items={rows[0]} />
        <Row items={rows[1]} reverse />
      </div>

      <ul className="trust-logos" aria-label="Brands that reviewed us" style={{ "--logo-cols": Math.ceil(LOGO_REVIEWS.length / 2) } as CSSProperties} data-reveal>
        {LOGO_REVIEWS.map((t) => (
          <li key={t.id}>
            <a href={t.url} target="_blank" rel="noopener noreferrer" title={t.brand} aria-label={`${t.brand} (opens ${t.instagram ? "Instagram" : "website"})`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo.src} alt="" width={56} height={56} loading="lazy" />
            </a>
          </li>
        ))}
      </ul>

      <p className="section-more">
        <Link href="/reviews" className="page-btn page-btn-ghost">
          See all {TESTIMONIALS.length} reviews <Icon name="arrow" size={16} />
        </Link>
      </p>
    </Section>
  );
};

export default HomeReviews;
