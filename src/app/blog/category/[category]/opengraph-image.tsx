import { OG_SIZE, renderOg } from "@/lib/og";
import { BLOG_CATEGORIES, getCategory, getPostsInCategory } from "@/lib/blog";

export const alt = "Blog category by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export function generateStaticParams() {
  return BLOG_CATEGORIES.filter((c) => getPostsInCategory(c.slug).length > 0).map((c) => ({ category: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const category = getCategory((await params).category);
  return renderOg({
    eyebrow: "Blog category",
    title: category?.name ?? "Blog",
    subtitle: category?.description,
    footer: "hamzatariq.site/blog",
  });
}
