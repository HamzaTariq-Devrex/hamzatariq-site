import "./styles/Work.css";
import ReviewCard from "./site/ReviewCard";
import { FEATURED_REVIEWS } from "@/lib/testimonials";

/** Home "What clients say": 6 real reviews (slider on phones). Plain <a> out of the home page on purpose. */
const HomeReviews = () =>
  FEATURED_REVIEWS.length === 0 ? null : (
    <div className="home-reviews" id="reviews">
      <div className="section-container">
        <div className="work-header">
          <div>
            <span className="work-eyebrow">Reviews</span>
            <h2 className="home-reviews-title">
              What clients <span>say</span>
            </h2>
          </div>
          <p className="work-intro">Brands that posted a review on Instagram after we built their website. Word for word, each linked to the brand.</p>
        </div>
        <div className="review-row">
          {FEATURED_REVIEWS.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
        <div className="work-more">
          <a href="/reviews" className="work-more-btn" data-cursor="disable">
            See all reviews
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );

export default HomeReviews;
