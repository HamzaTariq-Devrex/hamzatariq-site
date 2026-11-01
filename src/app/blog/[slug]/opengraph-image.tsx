import { OG_SIZE, renderOg } from "@/lib/og";
import { formatPostDate, getPost, getPosts } from "@/lib/blog";

export const alt = "Blog post by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 86400;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return renderOg({
    eyebrow: post?.category.name ?? "Blog",
    title: post?.title ?? "Blog",
    subtitle: post ? `${post.readingMinutes} min read · ${formatPostDate(post.published)}` : undefined,
    footer: "hamzatariq.site/blog",
  });
}
