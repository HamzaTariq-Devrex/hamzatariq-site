import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Homepage concept by Devrex Digital";
export const size = OG_SIZE;
export const contentType = "image/png";

// Generic on purpose: the link preview never shows a business's name or details.
export default function Image() {
  return renderOg({
    eyebrow: "Homepage concept",
    title: "A free homepage idea for your business",
    subtitle: "Made from your public details. Not your official website.",
    footer: "hamzatariq.site",
  });
}
