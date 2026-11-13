import Link from "next/link";
import { formatPostDate, isScheduled, type Post } from "@/lib/blog";
import Icon from "@/components/site/ds/Icon";
import PostCover from "./PostCover";

/**
 * Blog listing card: cover art on top (beside the text for the featured post), then category, date and
 * reading time, title, summary and "Read the post". Scheduled posts only appear on local and preview
 * builds, with a badge.
 */
const PostCard = ({ post, featured = false }: { post: Post; featured?: boolean }) => (
  <Link href={`/blog/${post.slug}`} className={`post-card${featured ? " is-featured" : ""}`} data-reveal data-cursor-label="Read">
    <PostCover post={post} size={featured ? "feature" : "card"} />
    <div className="post-card-body">
      <span className="post-card-meta">
        <span className="post-cat">{post.category.name}</span>
        {isScheduled(post) ? (
          <span className="post-scheduled">Scheduled {formatPostDate(post.published)}</span>
        ) : (
          <time dateTime={post.published}>{formatPostDate(post.published)}</time>
        )}
        <span>{post.readingMinutes} min read</span>
      </span>
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      <span className="post-card-more">
        Read the post
        <span className="post-card-arrow">
          <Icon name="arrow" size={15} />
        </span>
      </span>
    </div>
  </Link>
);

export default PostCard;
