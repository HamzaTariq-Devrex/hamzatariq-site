import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Contact Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Contact",
    title: "Book a free call about your project",
    subtitle: "Next.js websites, dashboards, AI chatbots and React SEO.",
    footer: "hamzatariq.site/contact",
  });
}
