import { OG_SIZE, renderOg } from "@/lib/og";
import { PROJECTS } from "@/data/projects";

export const alt = "Work by Hamza Tariq: custom websites and online stores";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Portfolio",
    title: `${PROJECTS.length} custom websites and online stores`,
    subtitle: "Fashion, jewellery, home decor, beauty, travel and B2B brands, built at Devrex Digital.",
    footer: "hamzatariq.site/work",
  });
}
