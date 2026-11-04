import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Client reviews for Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Reviews",
    title: "What clients say",
    subtitle: "Real reviews of websites, dashboards and AI chatbots.",
    footer: "hamzatariq.site/reviews",
  });
}
