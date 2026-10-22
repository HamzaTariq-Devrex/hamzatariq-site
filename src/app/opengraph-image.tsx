import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Hamza Tariq, Founder & Web Developer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Founder & Web Developer",
    title: "Custom-coded websites and online stores",
    subtitle: "React and Next.js websites, online stores and dashboards for brands in Pakistan and abroad.",
  });
}
