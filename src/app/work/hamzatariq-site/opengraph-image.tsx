import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Case study: hamzatariq.site migrated from Vite and React to Next.js";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Case study · React to Next.js SEO",
    title: "Mobile SEO 83 → 100, load time 18 s → 2.6 s",
    subtitle: "How I migrated my own site from Vite and React to Next.js 15 without changing the design.",
    footer: "hamzatariq.site/work/hamzatariq-site",
  });
}
