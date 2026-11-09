// Compiles a post's MDX on the server at build time (no client JS) with the blog's components.
import * as runtime from "react/jsx-runtime";
import Image from "next/image";
import Link from "next/link";
import { evaluate } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Icon from "@/components/site/ds/Icon";
import { SITE } from "@/lib/site";
import AuditCta from "@/components/site/AuditCta";
import ReviewCard from "@/components/site/ReviewCard";
import { getTestimonial } from "@/lib/testimonials";
import { isLivePost } from "@/lib/blog";

/** The "From my work" box every post needs: a real example from Hamza's projects. */
const FromMyWork = ({ title = "From my work", children }: { title?: string; children: React.ReactNode }) => (
  <aside className="post-work" aria-label={title}>
    <span className="post-work-label">
      <Icon name="sparkle" size={16} /> {title}
    </span>
    <div className="post-work-body">{children}</div>
  </aside>
);

/** Hamza's own recommendation, labelled as opinion (an information-gain block, see content/STYLE.md). */
const MyTake = ({ title = "What I recommend to clients", children }: { title?: string; children: React.ReactNode }) => (
  <aside className="post-take" aria-label={title}>
    <span className="post-work-label">
      <Icon name="chat" size={16} /> {title}
    </span>
    <div className="post-work-body">{children}</div>
  </aside>
);

/** A real client review from content/testimonials.json; content:check fails unknown ids. */
const Review = ({ id }: { id: string }) => {
  const review = getTestimonial(id);
  return review ? <ReviewCard review={review} /> : null;
};

/** Image with required alt text (checked by content:check) and an optional caption. */
const Figure = ({ src, alt, width, height, caption }: { src: string; alt: string; width: number; height: number; caption?: string }) => (
  <figure className="post-figure" data-clip>
    <Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 760px) 92vw, 720px" />
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
);

const A = ({ href = "", children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const internal = href.startsWith("/") || href.startsWith(SITE.url) || href.startsWith("#");
  if (!internal) {
    return (
      <a href={href} target="_blank" rel="noopener" {...rest}>
        {children}
      </a>
    );
  }
  const path = href.startsWith(SITE.url) ? href.slice(SITE.url.length) || "/" : href;
  // Older posts may link to a scheduled post; on the live site that link stays plain text until the post is out.
  const post = path.match(/^\/blog\/([a-z0-9-]+)\/?(?:[#?].*)?$/);
  if (post && !["category", "tag", "rss.xml"].includes(post[1]) && !isLivePost(post[1])) return <span>{children}</span>;
  // The home page is only ever opened with a full page load (see CLAUDE.md).
  return path === "/" || path.startsWith("#") ? (
    <a href={path} {...rest}>
      {children}
    </a>
  ) : (
    <Link href={path} {...rest}>
      {children}
    </Link>
  );
};

const Table = (props: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="post-table">
    <table {...props} />
  </div>
);

/** GFM task lists ("- [ ] item"): a decorative box instead of an unlabeled disabled checkbox. */
const TaskBox = () => <span className="post-check" aria-hidden="true" />;

const BlogAuditCta = () => <AuditCta location="blog" />;

const components = { FromMyWork, MyTake, Review, Figure, a: A, table: Table, input: TaskBox, AuditCta: BlogAuditCta };

/** `auditCta`: insert the free SEO audit box after the first <FromMyWork> box (blog posts). */
export const renderMdx = async (source: string, { auditCta = false }: { auditCta?: boolean } = {}) => {
  const end = source.indexOf("</FromMyWork>");
  const withCta = auditCta && end >= 0 ? `${source.slice(0, end + 13)}\n\n<AuditCta />\n${source.slice(end + 13)}` : source;
  const { default: Content } = await evaluate(withCta, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  });
  return <Content components={components} />;
};
