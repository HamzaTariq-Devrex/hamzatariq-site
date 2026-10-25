import { OG_SIZE, renderOg } from "@/lib/og";
import { SERVICES, formatPrice, getService } from "@/data/services";

export const alt = "Service by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getService(slug);
  return renderOg({
    eyebrow: s ? `${s.eyebrow} · from ${formatPrice(s.pricing[0])}` : "Services",
    title: s ? `${s.h1} ${s.h1Accent}` : "Services",
    subtitle: s?.summary,
    footer: s ? `hamzatariq.site/services/${s.slug}` : "hamzatariq.site",
  });
}
