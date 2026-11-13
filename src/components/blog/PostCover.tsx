import Image from "next/image";
import Icon from "@/components/site/ds/Icon";
import type { Post } from "@/lib/blog";

type IconName = Parameters<typeof Icon>[0]["name"];

/**
 * Cover art for posts without a cover image: the category's two accent tints, a faint grid, two rings
 * and a glass tile with the category icon. Pure CSS on the site tokens (Blog.css `.post-cover`), no
 * image request and no text, so it never repeats or invents anything. A post's own `cover` wins.
 */
const STYLE: Record<string, { icon: IconName; a: string; b: string }> = {
  "nextjs-websites": { icon: "code", a: "--accent-rgb", b: "--accent-2-rgb" },
  dashboards: { icon: "chart", a: "--accent-2-rgb", b: "--accent-3-rgb" },
  "ai-chatbots": { icon: "sparkle", a: "--accent-3-rgb", b: "--accent-rgb" },
  "react-nextjs-seo": { icon: "search", a: "--accent-2-rgb", b: "--accent-rgb" },
  hiring: { icon: "check", a: "--accent-rgb", b: "--accent-3-rgb" },
};
const FALLBACK = { icon: "layers" as IconName, a: "--accent-rgb", b: "--accent-2-rgb" };

type Props = { post: Post; size?: "card" | "feature" | "hero"; priority?: boolean };

const PostCover = ({ post, size = "card", priority = false }: Props) => {
  if (post.cover) {
    return (
      <div className={`post-cover is-${size} has-image`}>
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          sizes={size === "card" ? "(max-width: 760px) 92vw, 400px" : "(max-width: 1100px) 92vw, 1040px"}
          priority={priority}
        />
      </div>
    );
  }
  const s = STYLE[post.category.slug] ?? FALLBACK;
  const style = { "--c1": `var(${s.a})`, "--c2": `var(${s.b})` } as React.CSSProperties;
  return (
    <div className={`post-cover is-${size}`} style={style} aria-hidden="true">
      <span className="post-cover-ring" />
      <span className="post-cover-ring is-outer" />
      <span className="post-cover-tile">
        <Icon name={s.icon} size={size === "card" ? 26 : 34} />
      </span>
    </div>
  );
};

export default PostCover;
