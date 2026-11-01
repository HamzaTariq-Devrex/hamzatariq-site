import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Free SEO audit tool by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Free tool",
    title: "Free SEO audit tool",
    subtitle: "Can Google read your site? Score out of 100 and a fix list in under a minute.",
    footer: "hamzatariq.site/tools/free-seo-audit",
  });
}
