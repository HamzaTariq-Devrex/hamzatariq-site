import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Website cost calculator by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Free tool",
    title: "Website cost calculator",
    subtitle: "A starting price and delivery time for your project, from real published prices.",
    footer: "hamzatariq.site/tools/website-cost-calculator",
  });
}
