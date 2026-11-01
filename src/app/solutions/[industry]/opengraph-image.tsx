import { OG_SIZE, renderOg } from "@/lib/og";
import { getSolution, getSolutions } from "@/lib/solutions";

export const alt = "Industry solution by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getSolutions().map((s) => ({ industry: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ industry: string }> }) {
  const s = getSolution((await params).industry);
  return renderOg({
    eyebrow: s ? `For ${s.industry.toLowerCase()}` : "Solutions",
    title: s ? `${s.h1} ${s.h1Accent}` : "Solutions",
    subtitle: s?.lead,
    footer: s ? `hamzatariq.site/solutions/${s.slug}` : "hamzatariq.site/solutions",
  });
}
