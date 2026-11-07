import { OG_SIZE, renderOg } from "@/lib/og";
import { TESTIMONIALS } from "@/lib/testimonials";

export const alt = "Client reviews for Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Reviews",
    title: "What clients say",
    subtitle: `${TESTIMONIALS.length} brands, word for word, posted on Instagram.`,
    footer: "hamzatariq.site/reviews",
  });
}
