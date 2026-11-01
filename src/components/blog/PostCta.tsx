import Link from "next/link";
import BookCall from "@/components/site/BookCall";
import OpenChat from "@/components/site/ds/OpenChat";
import Icon from "@/components/site/ds/Icon";
import type { BlogCategory } from "@/lib/blog";

/** CTA closing every post: the matching service page (or /hire), a call, or the AI assistant. */
const PostCta = ({ category }: { category: BlogCategory }) => (
  <section className="post-cta" aria-label="Next step">
    <span className="x-label">Next step</span>
    <h2>{category.cta.title}</h2>
    <p>{category.cta.text}</p>
    <div className="x-actions">
      <Link href={category.cta.href} className="page-btn page-btn-primary">
        {category.cta.label} <Icon name="arrow" size={16} />
      </Link>
      <BookCall variant="ghost" />
      <OpenChat className="post-cta-chat">
        <Icon name="sparkle" size={16} /> Ask my AI assistant
      </OpenChat>
    </div>
  </section>
);

export default PostCta;
