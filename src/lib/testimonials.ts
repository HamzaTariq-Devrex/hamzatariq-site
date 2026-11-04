// Real client reviews from content/testimonials.json (added by the owner only). Read by /reviews,
// the blog's <Review id> component, the author box and the sitemap. Nothing here is ever invented.
import data from "../../content/testimonials.json";

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  company: string;
  url: string;
  quote: string;
  date: string;
  source: string;
  project?: string;
};

export const TESTIMONIALS: Testimonial[] = (data.items as Testimonial[]).filter((t) => t.id && t.name && t.quote);
export const getTestimonial = (id: string) => TESTIMONIALS.find((t) => t.id === id) ?? null;
/** /reviews only exists once there is at least one real review. */
export const hasReviews = TESTIMONIALS.length > 0;
