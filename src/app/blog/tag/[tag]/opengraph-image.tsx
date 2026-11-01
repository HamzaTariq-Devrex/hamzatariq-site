import { OG_SIZE, renderOg } from "@/lib/og";
import { getAllTags, tagFromSlug, tagSlug } from "@/lib/blog";

export const alt = "Blog tag by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 86400;

export function generateStaticParams() {
  return getAllTags().map((t) => ({ tag: tagSlug(t) }));
}

export default async function Image({ params }: { params: Promise<{ tag: string }> }) {
  const tag = tagFromSlug((await params).tag);
  return renderOg({ eyebrow: "Blog tag", title: `#${tag ?? "blog"}`, footer: "hamzatariq.site/blog" });
}
