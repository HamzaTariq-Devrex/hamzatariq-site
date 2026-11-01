import Image from "next/image";
import Link from "next/link";
import { formatPostDate, isScheduled, type Post } from "@/lib/blog";
import Icon from "@/components/site/ds/Icon";

/** Blog listing card. Scheduled posts only appear on local and preview builds, with a badge. */
const PostCard = ({ post, featured = false }: { post: Post; featured?: boolean }) => (
  <Link href={`/blog/${post.slug}`} className={`post-card${featured ? " is-featured" : ""}`} data-reveal>
    {post.cover && (
      <div className="post-card-cover">
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          sizes={featured ? "(max-width: 960px) 92vw, 640px" : "(max-width: 760px) 92vw, 380px"}
        />
      </div>
    )}
    <div className="post-card-body">
      <span className="post-card-meta">
        <span className="post-cat">{post.category.name}</span>
        <span>{post.readingMinutes} min read</span>
        {isScheduled(post) && <span className="post-scheduled">Scheduled {formatPostDate(post.published)}</span>}
      </span>
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      <span className="x-link">
        Read the post <Icon name="arrow" size={16} />
      </span>
    </div>
  </Link>
);

export default PostCard;
