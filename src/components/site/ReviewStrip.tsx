import Link from "next/link";
import Section from "@/components/site/ds/Section";
import Icon from "@/components/site/ds/Icon";
import ReviewCard from "@/components/site/ReviewCard";
import type { Testimonial } from "@/lib/testimonials";

type Props = {
  reviews: Testimonial[];
  label?: string;
  title?: React.ReactNode;
  text?: React.ReactNode;
};

/** A row of real reviews (3 columns, a swipeable slider on phones) with a link to /reviews. */
const ReviewStrip = ({ reviews, label = "Reviews", title = "What clients say", text }: Props) =>
  reviews.length === 0 ? null : (
    <Section label={label} title={title} text={text}>
      <div className="review-row">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
      <p className="review-more">
        <Link href="/reviews" className="x-link">
          See all reviews <Icon name="arrow" size={16} />
        </Link>
      </p>
    </Section>
  );

export default ReviewStrip;
