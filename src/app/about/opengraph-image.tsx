import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "About Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "About",
    title: "Hamza Tariq, React and Next.js developer",
    subtitle: "Founder of Devrex Digital. Custom-coded websites, dashboards and AI chatbots for 45+ brands.",
    footer: "hamzatariq.site/about",
  });
}
