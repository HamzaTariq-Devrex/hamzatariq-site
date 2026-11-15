import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Free website report by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Free website report",
    title: "Your free SEO and speed check",
    subtitle: "What to fix first, in plain words.",
    footer: "hamzatariq.site",
  });
}
