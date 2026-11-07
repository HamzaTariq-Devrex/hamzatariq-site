"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./styles/Work.css";
import "./styles/Reviews.css";
import { HOME_FEATURED_ID, LOGO_REVIEWS, REVIEW_LABEL, TESTIMONIALS, brandLinkLabel, getTestimonial, shortQuote, type Testimonial } from "@/lib/testimonials";

/**
 * Home "Trusted by" section: one featured quote, a two-row marquee of short quotes (opposite
 * directions, pauses on hover/focus, a static grid with reduced motion) and the client logos.
 * Every quote is word for word; cut ones end in "…" and link to the full review on /reviews.
 * Plain <a> links out of the home page on purpose (see CLAUDE.md).
 */
const MarqueeCard = ({ t, copy }: { t: Testimonial; copy: boolean }) => {
  const { text, trimmed } = shortQuote(t.quote);
  const tab = copy ? -1 : undefined;
  return (
    <figure className="trust-card">
      <figcaption className="trust-card-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.logo.src} alt="" width={32} height={32} loading="lazy" />
        <span>
          <a href={t.url} target="_blank" rel="noopener noreferrer" tabIndex={tab}>
            {t.brand}
          </a>
          <small>{t.category}</small>
        </span>
      </figcaption>
      <blockquote>&ldquo;{text}&rdquo;</blockquote>
      <div className="trust-card-foot">
        <p className="trust-card-label">{REVIEW_LABEL}</p>
        {trimmed && (
          <a href={`/reviews#${t.id}`} className="trust-card-more" tabIndex={tab}>
            Read full review
          </a>
        )}
      </div>
    </figure>
  );
};

const Row = ({ items, reverse }: { items: Testimonial[]; reverse?: boolean }) => (
  <div className={`trust-marquee${reverse ? " is-reverse" : ""}`}>
    <div className="trust-track">
      {items.map((t) => (
        <MarqueeCard key={t.id} t={t} copy={false} />
      ))}
      {/* Second copy makes the loop seamless; hidden from screen readers and the tab order. */}
      <div className="trust-copy" aria-hidden="true">
        {items.map((t) => (
          <MarqueeCard key={`${t.id}-copy`} t={t} copy />
        ))}
      </div>
    </div>
  </div>
);

const HomeReviews = () => {
  const ref = useRef<HTMLDivElement>(null);

  // Fade and rise in on scroll (the home tree has no SiteShell Reveal).
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("is-armed");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-in");
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const featured = getTestimonial(HOME_FEATURED_ID);
  if (!featured) return null;
  const rest = TESTIMONIALS.filter((t) => t.id !== featured.id);
  const rows = [rest.filter((_, i) => i % 2 === 0), rest.filter((_, i) => i % 2 === 1)];

  return (
    <div className="home-reviews home-trust" id="reviews" ref={ref}>
      <div className="section-container trust-container">
        <header className="trust-header trust-rise">
          <span className="work-eyebrow">Reviews</span>
          <h2 className="home-reviews-title">
            Trusted by {TESTIMONIALS.length}+ <span>brands</span>
          </h2>
          <p>Reviews brands posted on Instagram after we built their websites. Word for word, each linked to the brand.</p>
        </header>

        <figure className="trust-featured trust-rise">
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

        <div className="trust-wall trust-rise" aria-label="More client reviews">
          <Row items={rows[0]} />
          <Row items={rows[1]} reverse />
        </div>

        <ul className="trust-logos trust-rise" aria-label="Brands that reviewed us" style={{ "--logo-cols": Math.ceil(LOGO_REVIEWS.length / 2) } as CSSProperties}>
          {LOGO_REVIEWS.map((t) => (
            <li key={t.id}>
              <a href={t.url} target="_blank" rel="noopener noreferrer" title={t.brand} aria-label={`${t.brand} (opens ${t.instagram ? "Instagram" : "website"})`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.logo.src} alt="" width={56} height={56} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>

        <div className="trust-more">
          <a href="/reviews" className="work-more-btn" data-cursor="disable">
            See all {TESTIMONIALS.length} reviews
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomeReviews;
