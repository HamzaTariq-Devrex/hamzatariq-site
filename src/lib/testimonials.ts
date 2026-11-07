// Real client reviews from content/testimonials.json, copied word for word from the agency's public
// reviews page (clients posted them on Instagram). Nothing here is ever invented, edited or rated.
import data from "../../content/testimonials.json";

export type ReviewImage = { src: string; width: number; height: number };
export type Testimonial = {
  id: string;
  brand: string;
  instagram: string | null;
  url: string;
  category: string;
  segment: "fashion" | "ecommerce" | "travel" | "clinic";
  quote: string;
  project: string | null;
  logo: ReviewImage;
  /** The brand image is a photo of a person, not a logo (left out of the home logo row). */
  logoIsPhoto?: boolean;
  image: ReviewImage | null;
  featured: boolean;
};

/** Shown on every review: the reviews were given to the agency, for projects Hamza led. */
export const REVIEW_LABEL = "Review for Devrex Digital · Project led by Hamza Tariq";
export const REVIEWS_SOURCE: string = data.source;

export const TESTIMONIALS: Testimonial[] = (data.items as Testimonial[]).filter((t) => t.id && t.brand && t.quote);
export const getTestimonial = (id: string) => TESTIMONIALS.find((t) => t.id === id) ?? null;
/** /reviews only exists once there is at least one real review. */
export const hasReviews = TESTIMONIALS.length > 0;

const pick = (ids: string[]) => ids.map(getTestimonial).filter((t): t is Testimonial => !!t);

/** The 6 reviews on the home page. */
export const FEATURED_REVIEWS = TESTIMONIALS.filter((t) => t.featured).slice(0, 6);
/** The client's own review on /work/<slug>. */
export const getProjectReview = (slug: string) => TESTIMONIALS.find((t) => t.project === slug) ?? null;
/** Online stores (fashion and other ecommerce), longest first: /services/nextjs-websites and /solutions/ecommerce-brands. */
export const STORE_REVIEWS = TESTIMONIALS.filter((t) => t.segment === "fashion" || t.segment === "ecommerce")
  .slice()
  .sort((a, b) => b.quote.length - a.quote.length);
export const CLINIC_REVIEWS = TESTIMONIALS.filter((t) => t.segment === "clinic");
/** 3-review strips: /hire is about how the work goes, /about about working with Hamza. */
export const HIRE_REVIEWS = pick(["nagina-house-of-jewels", "cultural-craft-co", "the-mark-by-strokes"]);
export const ABOUT_REVIEWS = pick(["just-petssionate", "kulanch-artisanal", "palfrey-and-gulaabo"]);

/** Reviews shown on a service or industry page (empty when none fit). */
export const reviewsForPage = (page: "service:nextjs-websites" | "solution:ecommerce-brands" | "solution:clinics-dental" | string) => {
  if (page === "service:nextjs-websites" || page === "solution:ecommerce-brands") return STORE_REVIEWS.slice(0, 6);
  if (page === "solution:clinics-dental") return CLINIC_REVIEWS;
  return [];
};

/** Home "Trusted by" featured quote (owner's example: Nagina House of Jewels). */
export const HOME_FEATURED_ID = "nagina-house-of-jewels";
/** Home logo row: real logos only. */
export const LOGO_REVIEWS = TESTIMONIALS.filter((t) => !t.logoIsPhoto);

/**
 * A shorter excerpt for compact cards. Never changes words: it only cuts at a word boundary (and
 * drops punctuation left dangling at the cut) and marks the cut with "…"; cards that cut link to
 * the full review on /reviews.
 */
export const shortQuote = (quote: string, max = 110): { text: string; trimmed: boolean } => {
  if (quote.length <= max) return { text: quote, trimmed: false };
  const cut = quote.slice(0, max);
  const atWord = cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.!?\-–—]+$/, "");
  return { text: `${atWord}…`, trimmed: true };
};

/** Link label for the brand: its Instagram (where the review was posted) or its website. */
export const brandLinkLabel = (t: Testimonial) =>
  t.instagram ? "Verified on Instagram" : `Visit ${t.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}`;

/** Categories with counts, most reviews first (filter chips and the stats bar on /reviews). */
export const REVIEW_CATEGORIES = Object.entries(
  TESTIMONIALS.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + 1 }), {}),
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
