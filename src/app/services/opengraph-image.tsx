import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Services by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Services",
    title: "Next.js websites, dashboards, AI chatbots and SEO",
    subtitle: "Custom code, no templates. Every project is quoted after a free call.",
    footer: "hamzatariq.site/services",
  });
}
