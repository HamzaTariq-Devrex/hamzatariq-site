import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Web development solutions by industry";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Solutions",
    title: "Built around your industry",
    subtitle: "Ecommerce, restaurants, clinics, real estate, SaaS and agencies.",
    footer: "hamzatariq.site/solutions",
  });
}
