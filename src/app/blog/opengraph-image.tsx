import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Blog by Hamza Tariq: Next.js, React SEO and AI chatbots";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Blog",
    title: "Notes from building fast websites",
    subtitle: "Next.js websites, dashboards, AI chatbots and React SEO, with real numbers from real projects.",
    footer: "hamzatariq.site/blog",
  });
}
